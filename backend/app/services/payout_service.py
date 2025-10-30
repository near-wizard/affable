"""
Payout Service

Handles payout generation and processing with support for multiple payment providers
including Stripe Connect and manual payment methods.
"""

import logging
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal

from app.models import (
    Payout, PayoutEvent, ConversionEvent, Partner,
    PartnerPaymentMethod, PaymentProvider
)
from app.core.exceptions import NotFoundException, BadRequestException, ConflictException
from app.services.payout_processor import (
    PayoutProcessorFactory,
    PayoutRequest,
    PayoutStatus,
)

logger = logging.getLogger(__name__)


class PayoutService:
    """Service for payout operations."""
    
    @staticmethod
    def generate_payout(
        db: Session,
        partner_id: int,
        start_date: datetime,
        end_date: datetime,
        payment_method_id: Optional[int] = None
    ) -> Payout:
        """
        Generate a payout for a partner for approved conversions in date range.
        
        Args:
            db: Database session
            partner_id: Partner ID
            start_date: Period start date
            end_date: Period end date
            payment_method_id: Optional specific payment method
            
        Returns:
            Created Payout object
            
        Raises:
            NotFoundException: If partner or payment method not found
            BadRequestException: If no conversions to pay or payment method invalid
        """
        # Verify partner exists
        partner = db.query(Partner).filter(
            Partner.partner_id == partner_id,
            Partner.is_deleted == False
        ).first()
        
        if not partner:
            raise NotFoundException("Partner not found")
        
        # Get payment method
        if payment_method_id:
            payment_method = db.query(PartnerPaymentMethod).filter(
                PartnerPaymentMethod.partner_payment_method_id == payment_method_id,
                PartnerPaymentMethod.partner_id == partner_id,
                PartnerPaymentMethod.is_deleted == False
            ).first()
        else:
            # Get default payment method
            payment_method = db.query(PartnerPaymentMethod).filter(
                PartnerPaymentMethod.partner_id == partner_id,
                PartnerPaymentMethod.is_default == True,
                PartnerPaymentMethod.is_deleted == False
            ).first()
        
        if not payment_method:
            raise BadRequestException("No payment method found. Please add a payment method first.")
        
        if not payment_method.is_verified:
            raise BadRequestException("Payment method must be verified before generating payouts")
        
        # Get approved conversions not yet paid
        conversions = db.query(ConversionEvent).filter(
            ConversionEvent.partner_id == partner_id,
            ConversionEvent.status == 'approved',
            ConversionEvent.occurred_at >= start_date,
            ConversionEvent.occurred_at <= end_date,
            ConversionEvent.is_deleted == False
        ).filter(
            # Not already included in a payout
            ~ConversionEvent.conversion_event_id.in_(
                db.query(PayoutEvent.conversion_event_id)
            )
        ).all()
        
        if not conversions:
            raise BadRequestException("No approved conversions found for this period")
        
        # Calculate total amount
        total_amount = sum(c.commission_amount or Decimal('0') for c in conversions)
        
        if total_amount <= 0:
            raise BadRequestException("Total payout amount must be greater than zero")
        
        # Create payout
        payout = Payout(
            partner_id=partner_id,
            partner_payment_method_id=payment_method.partner_payment_method_id,
            amount=total_amount,
            currency='USD',
            payment_provider_id=payment_method.payment_provider_id,
            status='pending',
            start_date=start_date,
            end_date=end_date
        )
        
        db.add(payout)
        db.flush()  # Get payout_id
        
        # Create payout events
        for conversion in conversions:
            payout_event = PayoutEvent(
                payout_id=payout.payout_id,
                conversion_event_id=conversion.conversion_event_id,
                commission_amount=conversion.commission_amount or Decimal('0')
            )
            db.add(payout_event)
        
        db.commit()
        db.refresh(payout)
        
        return payout
    
    @staticmethod
    def generate_bulk_payouts(
        db: Session,
        start_date: datetime,
        end_date: datetime,
        partner_ids: Optional[List[int]] = None,
        min_amount: Decimal = Decimal('0')
    ) -> List[Payout]:
        """
        Generate payouts for multiple partners.
        
        Args:
            db: Database session
            start_date: Period start date
            end_date: Period end date
            partner_ids: Optional list of specific partner IDs
            min_amount: Minimum payout amount threshold
            
        Returns:
            List of created Payout objects
        """
        # Get partners with approved conversions
        query = db.query(Partner).join(ConversionEvent).filter(
            ConversionEvent.status == 'approved',
            ConversionEvent.occurred_at >= start_date,
            ConversionEvent.occurred_at <= end_date,
            ConversionEvent.is_deleted == False,
            Partner.is_deleted == False
        ).filter(
            # Not already in a payout
            ~ConversionEvent.conversion_event_id.in_(
                db.query(PayoutEvent.conversion_event_id)
            )
        ).distinct()
        
        if partner_ids:
            query = query.filter(Partner.partner_id.in_(partner_ids))
        
        partners = query.all()
        
        payouts = []
        for partner in partners:
            try:
                payout = PayoutService.generate_payout(
                    db, partner.partner_id, start_date, end_date
                )
                
                # Check minimum amount
                if payout.amount >= min_amount:
                    payouts.append(payout)
                else:
                    # Delete payout if below minimum
                    db.delete(payout)
                    db.commit()
            
            except (BadRequestException, NotFoundException) as e:
                # Skip partners with errors
                continue
        
        return payouts
    
    @staticmethod
    def process_payout(db: Session, payout_id: int) -> Payout:
        """
        Process a payout (send to payment provider).
        
        In a real implementation, this would integrate with payment provider APIs.
        For now, it marks the payout as processing.
        
        Args:
            db: Database session
            payout_id: Payout ID
            
        Returns:
            Updated Payout object
            
        Raises:
            NotFoundException: If payout not found
            BadRequestException: If payout already processed
        """
        payout = db.query(Payout).filter(
            Payout.payout_id == payout_id,
            Payout.is_deleted == False
        ).first()
        
        if not payout:
            raise NotFoundException("Payout not found")
        
        if payout.status != 'pending':
            raise BadRequestException(f"Payout is already {payout.status}")
        
        # Mark as processing
        payout.process()
        db.commit()
        
        # TODO: Integrate with payment provider API
        # - PayPal: Use PayPal Payouts API
        # - Stripe: Use Stripe Connect payouts
        # - Wire: Manual process
        
        # For now, simulate successful processing
        # In production, this would be done by a background job after API call
        payout.complete(f"MOCK-TXN-{payout.payout_id}")
        
        # Mark conversions as paid
        conversions = db.query(ConversionEvent).join(PayoutEvent).filter(
            PayoutEvent.payout_id == payout_id
        ).all()
        
        for conversion in conversions:
            conversion.mark_paid()
        
        db.commit()
        db.refresh(payout)
        
        return payout
    
    @staticmethod
    def cancel_payout(db: Session, payout_id: int, reason: str) -> Payout:
        """
        Cancel a pending payout.
        
        Args:
            db: Database session
            payout_id: Payout ID
            reason: Cancellation reason
            
        Returns:
            Updated Payout object
            
        Raises:
            NotFoundException: If payout not found
            BadRequestException: If payout cannot be cancelled
        """
        payout = db.query(Payout).filter(
            Payout.payout_id == payout_id,
            Payout.is_deleted == False
        ).first()
        
        if not payout:
            raise NotFoundException("Payout not found")
        
        if payout.status not in ['pending', 'processing']:
            raise BadRequestException("Only pending or processing payouts can be cancelled")
        
        payout.fail(reason)
        db.commit()
        db.refresh(payout)
        
        return payout
    
    @staticmethod
    def get_partner_payouts(
        db: Session,
        partner_id: int,
        status: Optional[str] = None
    ) -> List[Payout]:
        """
        Get all payouts for a partner.
        
        Args:
            db: Database session
            partner_id: Partner ID
            status: Optional status filter
            
        Returns:
            List of Payout objects
        """
        query = db.query(Payout).filter(
            Payout.partner_id == partner_id,
            Payout.is_deleted == False
        )
        
        if status:
            query = query.filter(Payout.status == status)
        
        return query.order_by(Payout.created_at.desc()).all()
    
    @staticmethod
    def get_payout_details(db: Session, payout_id: int) -> dict:
        """
        Get detailed payout information including conversions.
        
        Args:
            db: Database session
            payout_id: Payout ID
            
        Returns:
            Dictionary with payout details
            
        Raises:
            NotFoundException: If payout not found
        """
        payout = db.query(Payout).filter(
            Payout.payout_id == payout_id,
            Payout.is_deleted == False
        ).first()
        
        if not payout:
            raise NotFoundException("Payout not found")
        
        # Get conversions
        conversions = db.query(ConversionEvent).join(PayoutEvent).filter(
            PayoutEvent.payout_id == payout_id
        ).all()
        
        return {
            'payout_id': payout.payout_id,
            'partner_id': payout.partner_id,
            'amount': float(payout.amount),
            'currency': payout.currency,
            'status': payout.status,
            'start_date': payout.start_date,
            'end_date': payout.end_date,
            'created_at': payout.created_at,
            'processed_at': payout.processed_at,
            'completed_at': payout.completed_at,
            'provider_transaction_id': payout.provider_transaction_id,
            'conversions': [
                {
                    'conversion_event_id': c.conversion_event_id,
                    'transaction_id': c.transaction_id,
                    'event_value': float(c.event_value or 0),
                    'commission_amount': float(c.commission_amount or 0),
                    'occurred_at': c.occurred_at
                }
                for c in conversions
            ],
            'total_conversions': len(conversions)
        }
    
    @staticmethod
    def get_pending_payout_amount(db: Session, partner_id: int) -> Decimal:
        """
        Get total pending payout amount for a partner.
        
        Args:
            db: Database session
            partner_id: Partner ID
            
        Returns:
            Total pending amount
        """
        from sqlalchemy import func
        
        result = db.query(
            func.sum(ConversionEvent.commission_amount)
        ).filter(
            ConversionEvent.partner_id == partner_id,
            ConversionEvent.status == 'approved',
            ConversionEvent.is_deleted == False
        ).filter(
            # Not in any payout
            ~ConversionEvent.conversion_event_id.in_(
                db.query(PayoutEvent.conversion_event_id)
            )
        ).scalar()
        
        return result or Decimal('0')

    @staticmethod
    def process_payout_with_provider(
        db: Session,
        payout_id: int,
        processor_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a payout using the appropriate payment provider.

        Handles routing to Stripe Connect for Stripe-connected partners,
        or manual processing for other payment methods.

        Args:
            db: Database session
            payout_id: Payout ID to process
            processor_config: Optional custom processor configuration

        Returns:
            Dictionary with processing result

        Raises:
            NotFoundException: If payout or payment method not found
            BadRequestException: If payout cannot be processed
        """
        payout = db.query(Payout).filter(
            Payout.payout_id == payout_id,
            Payout.is_deleted == False
        ).first()

        if not payout:
            raise NotFoundException("Payout not found")

        if payout.status != 'pending':
            raise BadRequestException(f"Payout is already {payout.status}")

        # Get payment method and provider info
        payment_method = db.query(PartnerPaymentMethod).filter(
            PartnerPaymentMethod.partner_payment_method_id == payout.partner_payment_method_id
        ).first()

        if not payment_method:
            raise NotFoundException("Payment method not found")

        provider = db.query(PaymentProvider).filter(
            PaymentProvider.payment_provider_id == payout.payment_provider_id
        ).first()

        if not provider:
            raise NotFoundException("Payment provider not found")

        try:
            # Mark as processing
            payout.process()
            db.commit()

            # Create processor based on payment provider
            processor_name = provider.name.lower()
            config = processor_config or (provider.config or {})

            # Ensure processor is registered (import if needed)
            if processor_name == "stripe":
                # Use Stripe Connect processor
                from app.services.stripe_connect_processor import StripeConnectProcessor
                processor_name = "stripe_connect"

            processor = PayoutProcessorFactory.create_processor(processor_name, config)

            # Build payout request
            payout_request = PayoutRequest(
                payout_id=payout_id,
                partner_id=payout.partner_id,
                amount=payout.amount,
                currency=payout.currency,
                provider_account_id=payment_method.provider_account_id,
                description=f"Commission payout for period {payout.start_date.date()} to {payout.end_date.date()}",
                metadata={
                    "start_date": payout.start_date.isoformat(),
                    "end_date": payout.end_date.isoformat(),
                }
            )

            # Process payout with provider
            result = processor.process_payout(payout_request)

            # Update payout with result
            if result.success:
                payout.provider_transaction_id = result.provider_transaction_id
                payout.provider_response = result.raw_response

                # If provider returns completed status, mark as complete
                if result.status == PayoutStatus.COMPLETED:
                    payout.complete(result.provider_transaction_id or "")
                    # Mark conversions as paid
                    conversions = db.query(ConversionEvent).join(PayoutEvent).filter(
                        PayoutEvent.payout_id == payout_id
                    ).all()
                    for conversion in conversions:
                        conversion.mark_paid()
                # Otherwise keep as processing

                db.commit()

                logger.info(
                    f"Successfully processed payout {payout_id} via {processor_name}: "
                    f"{result.provider_transaction_id}"
                )

                return {
                    "success": True,
                    "payout_id": payout_id,
                    "status": payout.status,
                    "provider_transaction_id": result.provider_transaction_id,
                    "message": f"Payout processing initiated via {provider.display_name}"
                }
            else:
                # Mark as failed
                payout.fail(result.error_message or "Provider processing failed")
                payout.provider_response = result.raw_response
                db.commit()

                logger.error(
                    f"Failed to process payout {payout_id}: {result.error_message}"
                )

                return {
                    "success": False,
                    "payout_id": payout_id,
                    "status": "failed",
                    "error": result.error_message,
                    "message": f"Failed to process payout: {result.error_message}"
                }

        except Exception as e:
            # Mark as failed
            payout.fail(str(e))
            db.commit()

            logger.error(f"Unexpected error processing payout {payout_id}: {str(e)}")

            return {
                "success": False,
                "payout_id": payout_id,
                "status": "failed",
                "error": str(e),
                "message": f"Unexpected error: {str(e)}"
            }

    @staticmethod
    def process_multiple_payouts(
        db: Session,
        payout_ids: List[int],
        processor_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process multiple payouts in batch.

        Args:
            db: Database session
            payout_ids: List of payout IDs to process
            processor_config: Optional custom processor configuration

        Returns:
            Dictionary with batch processing results
        """
        results = {
            "total": len(payout_ids),
            "successful": 0,
            "failed": 0,
            "payouts": []
        }

        for payout_id in payout_ids:
            try:
                result = PayoutService.process_payout_with_provider(
                    db, payout_id, processor_config
                )
                results["payouts"].append(result)

                if result.get("success"):
                    results["successful"] += 1
                else:
                    results["failed"] += 1

            except Exception as e:
                results["failed"] += 1
                results["payouts"].append({
                    "payout_id": payout_id,
                    "success": False,
                    "error": str(e)
                })

        return results

    @staticmethod
    def check_payout_status(
        db: Session,
        payout_id: int,
        processor_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Check the current status of a payout from the payment provider.

        Args:
            db: Database session
            payout_id: Payout ID to check
            processor_config: Optional custom processor configuration

        Returns:
            Dictionary with payout status information
        """
        payout = db.query(Payout).filter(
            Payout.payout_id == payout_id,
            Payout.is_deleted == False
        ).first()

        if not payout:
            raise NotFoundException("Payout not found")

        if not payout.provider_transaction_id:
            return {
                "payout_id": payout_id,
                "status": payout.status,
                "message": "Payout has not been sent to provider yet"
            }

        # Get provider info
        provider = db.query(PaymentProvider).filter(
            PaymentProvider.payment_provider_id == payout.payment_provider_id
        ).first()

        if not provider:
            raise NotFoundException("Payment provider not found")

        try:
            # Create processor
            processor_name = provider.name.lower()
            if processor_name == "stripe":
                from app.services.stripe_connect_processor import StripeConnectProcessor
                processor_name = "stripe_connect"

            config = processor_config or (provider.config or {})
            processor = PayoutProcessorFactory.create_processor(processor_name, config)

            # Check status with provider
            status_info = processor.retrieve_payout_status(payout.provider_transaction_id)

            return {
                "payout_id": payout_id,
                "internal_status": payout.status,
                "provider_status": status_info
            }

        except Exception as e:
            logger.error(f"Error checking payout status: {str(e)}")
            return {
                "payout_id": payout_id,
                "internal_status": payout.status,
                "error": str(e)
            }