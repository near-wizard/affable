"""Payout scheduling service for automated recurring payouts."""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models import Partner, Vendor
from app.models.payout import Payout
from app.models.payout_schedule import PayoutSchedule, PayoutScheduleExecution, PayoutFrequency
from app.services.payout_service import PayoutService
from app.core.exceptions import NotFoundException, BadRequestException

logger = logging.getLogger(__name__)


class PayoutSchedulingService:
    """Service for managing payout schedules and executing scheduled payouts."""

    @staticmethod
    def create_schedule(
        db: Session,
        vendor_id: int,
        frequency: PayoutFrequency,
        day_of_period: int = 15,
        partner_id: Optional[int] = None,
        min_amount: int = 0,
        notes: Optional[str] = None,
    ) -> PayoutSchedule:
        """
        Create a new payout schedule.

        Args:
            db: Database session
            vendor_id: Vendor ID
            frequency: Payout frequency (weekly, biweekly, monthly, quarterly, manually)
            day_of_period: Day of week/month to process payouts
            partner_id: Optional specific partner (if None, applies to all)
            min_amount: Minimum amount in cents to trigger payout
            notes: Optional notes

        Returns:
            Created PayoutSchedule object
        """
        # Verify vendor exists
        vendor = db.query(Vendor).filter(Vendor.vendor_id == vendor_id).first()
        if not vendor:
            raise NotFoundException("Vendor not found")

        # Verify partner if specified
        if partner_id:
            partner = db.query(Partner).filter(Partner.partner_id == partner_id).first()
            if not partner:
                raise NotFoundException("Partner not found")

        # Validate day of period
        if frequency in [PayoutFrequency.WEEKLY, PayoutFrequency.BIWEEKLY]:
            if not 0 <= day_of_period <= 6:
                raise BadRequestException("Day of week must be 0-6 (0=Monday)")
        else:
            if not 1 <= day_of_period <= 31:
                raise BadRequestException("Day of month must be 1-31")

        schedule = PayoutSchedule(
            vendor_id=vendor_id,
            partner_id=partner_id,
            frequency=frequency,
            day_of_period=day_of_period,
            min_amount=min_amount,
            notes=notes,
            next_scheduled_at=PayoutSchedulingService._calculate_next_execution(frequency, day_of_period),
        )

        db.add(schedule)
        db.commit()
        db.refresh(schedule)

        logger.info(
            f"Created payout schedule {schedule.payout_schedule_id} "
            f"for vendor {vendor_id} with frequency {frequency}"
        )

        return schedule

    @staticmethod
    def update_schedule(
        db: Session,
        schedule_id: int,
        frequency: Optional[PayoutFrequency] = None,
        day_of_period: Optional[int] = None,
        min_amount: Optional[int] = None,
        is_active: Optional[bool] = None,
        notes: Optional[str] = None,
    ) -> PayoutSchedule:
        """Update an existing payout schedule."""
        schedule = db.query(PayoutSchedule).filter(
            PayoutSchedule.payout_schedule_id == schedule_id
        ).first()

        if not schedule:
            raise NotFoundException("Payout schedule not found")

        if frequency is not None:
            schedule.frequency = frequency
        if day_of_period is not None:
            schedule.day_of_period = day_of_period
        if min_amount is not None:
            schedule.min_amount = min_amount
        if is_active is not None:
            schedule.is_active = is_active
        if notes is not None:
            schedule.notes = notes

        # Recalculate next execution
        if frequency or day_of_period:
            schedule.next_scheduled_at = PayoutSchedulingService._calculate_next_execution(
                schedule.frequency, schedule.day_of_period
            )

        db.commit()
        db.refresh(schedule)

        return schedule

    @staticmethod
    def delete_schedule(db: Session, schedule_id: int) -> bool:
        """Delete a payout schedule."""
        schedule = db.query(PayoutSchedule).filter(
            PayoutSchedule.payout_schedule_id == schedule_id
        ).first()

        if not schedule:
            raise NotFoundException("Payout schedule not found")

        db.delete(schedule)
        db.commit()

        logger.info(f"Deleted payout schedule {schedule_id}")
        return True

    @staticmethod
    def get_vendor_schedules(db: Session, vendor_id: int) -> List[PayoutSchedule]:
        """Get all payout schedules for a vendor."""
        return db.query(PayoutSchedule).filter(
            PayoutSchedule.vendor_id == vendor_id,
            PayoutSchedule.is_deleted == False,
        ).all()

    @staticmethod
    def execute_pending_schedules(db: Session, vendor_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute all pending payout schedules.

        This should be called by a scheduled job (e.g., Celery beat).

        Args:
            db: Database session
            vendor_id: Optional specific vendor to process

        Returns:
            Dictionary with execution results
        """
        now = datetime.utcnow()
        results = {
            "total_schedules": 0,
            "executed": 0,
            "skipped": 0,
            "failed": 0,
            "executions": []
        }

        # Get all active schedules that are due
        query = db.query(PayoutSchedule).filter(
            PayoutSchedule.is_active == True,
            PayoutSchedule.is_deleted == False,
            PayoutSchedule.next_scheduled_at <= now,
        )

        if vendor_id:
            query = query.filter(PayoutSchedule.vendor_id == vendor_id)

        schedules = query.all()
        results["total_schedules"] = len(schedules)

        for schedule in schedules:
            try:
                execution_result = PayoutSchedulingService._execute_schedule(db, schedule, now)
                results["executions"].append(execution_result)

                if execution_result.get("status") == "executed":
                    results["executed"] += 1
                elif execution_result.get("status") == "skipped":
                    results["skipped"] += 1
                else:
                    results["failed"] += 1

            except Exception as e:
                logger.error(f"Error executing schedule {schedule.payout_schedule_id}: {str(e)}")
                results["failed"] += 1
                results["executions"].append({
                    "schedule_id": schedule.payout_schedule_id,
                    "status": "failed",
                    "error": str(e)
                })

        return results

    @staticmethod
    def _execute_schedule(
        db: Session,
        schedule: PayoutSchedule,
        execution_time: datetime
    ) -> Dict[str, Any]:
        """
        Execute a single payout schedule.

        Generates payouts for all partners with pending commissions.
        """
        execution = PayoutScheduleExecution(
            payout_schedule_id=schedule.payout_schedule_id,
            status="processing",
            scheduled_at=execution_time,
            executed_at=execution_time,
        )

        try:
            # Generate payouts for this schedule
            if schedule.partner_id:
                # Single partner schedule
                partners = [db.query(Partner).filter(Partner.partner_id == schedule.partner_id).first()]
            else:
                # All partners in vendor's campaigns
                partners = (
                    db.query(Partner)
                    .distinct()
                    .join(
                        from_statement=Partner.campaigns
                    )
                    .filter(Partner.is_deleted == False)
                    .all()
                )

            generated_payouts = []
            total_amount = 0

            for partner in partners:
                if not partner:
                    continue

                # Calculate payout period (last period)
                period_end = execution_time.replace(day=1) - timedelta(days=1)
                period_start = period_end.replace(day=1)

                try:
                    # Try to generate payout
                    payout = PayoutService.generate_payout(
                        db,
                        partner_id=partner.partner_id,
                        start_date=period_start,
                        end_date=period_end,
                    )

                    # Check minimum amount
                    if payout.amount >= Decimal(schedule.min_amount / 100):
                        generated_payouts.append(payout.payout_id)
                        total_amount += int(payout.amount * 100)
                    else:
                        # Delete payout if below minimum
                        db.delete(payout)
                        db.commit()

                except Exception as e:
                    # Partner may not have enough commissions - skip
                    logger.debug(f"Could not generate payout for partner {partner.partner_id}: {str(e)}")
                    continue

            if generated_payouts:
                execution.status = "completed"
                execution.payout_ids = ",".join(str(p) for p in generated_payouts)
                execution.total_payouts = len(generated_payouts)
                execution.total_amount = total_amount
                execution.completed_at = datetime.utcnow()
            else:
                execution.status = "skipped"
                execution.skip_reason = "No partners with pending payouts or below minimum amount"

            # Update next scheduled time
            schedule.last_processed_at = execution_time
            schedule.next_scheduled_at = PayoutSchedulingService._calculate_next_execution(
                schedule.frequency,
                schedule.day_of_period,
                from_date=execution_time
            )

            db.add(execution)
            db.commit()

            return {
                "schedule_id": schedule.payout_schedule_id,
                "status": "executed" if execution.status == "completed" else execution.status,
                "payouts_created": len(generated_payouts),
                "total_amount": total_amount,
                "payout_ids": generated_payouts,
            }

        except Exception as e:
            execution.status = "failed"
            execution.error_message = str(e)
            db.add(execution)
            db.commit()

            logger.error(f"Error executing schedule {schedule.payout_schedule_id}: {str(e)}")

            return {
                "schedule_id": schedule.payout_schedule_id,
                "status": "failed",
                "error": str(e),
            }

    @staticmethod
    def _calculate_next_execution(
        frequency: PayoutFrequency,
        day_of_period: int,
        from_date: Optional[datetime] = None
    ) -> datetime:
        """
        Calculate the next execution date for a schedule.

        Args:
            frequency: Payout frequency
            day_of_period: Day of week/month
            from_date: Date to calculate from (default: now)

        Returns:
            Next execution datetime
        """
        if from_date is None:
            from_date = datetime.utcnow()

        if frequency == PayoutFrequency.WEEKLY:
            # Find next occurrence of day_of_period (0=Monday)
            days_ahead = day_of_period - from_date.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return from_date + timedelta(days=days_ahead)

        elif frequency == PayoutFrequency.BIWEEKLY:
            # Every 2 weeks on day_of_period
            days_ahead = day_of_period - from_date.weekday()
            if days_ahead <= 0:
                days_ahead += 14
            else:
                days_ahead -= 7  # Adjust to get exactly biweekly
            return from_date + timedelta(days=days_ahead)

        elif frequency == PayoutFrequency.MONTHLY:
            # Same day next month
            if from_date.month == 12:
                next_month = from_date.replace(year=from_date.year + 1, month=1, day=min(day_of_period, 28))
            else:
                next_month = from_date.replace(month=from_date.month + 1, day=min(day_of_period, 28))
            return next_month if next_month > from_date else next_month

        elif frequency == PayoutFrequency.QUARTERLY:
            # Every 3 months
            month = from_date.month + 3
            year = from_date.year
            if month > 12:
                month -= 12
                year += 1
            next_quarter = from_date.replace(year=year, month=month, day=min(day_of_period, 28))
            return next_quarter if next_quarter > from_date else next_quarter

        else:  # MANUALLY
            # Set far in future for manual schedules
            return from_date + timedelta(days=365)

    @staticmethod
    def get_schedule_executions(
        db: Session,
        schedule_id: int,
        limit: int = 20
    ) -> List[PayoutScheduleExecution]:
        """Get execution history for a schedule."""
        return db.query(PayoutScheduleExecution).filter(
            PayoutScheduleExecution.payout_schedule_id == schedule_id,
            PayoutScheduleExecution.is_deleted == False,
        ).order_by(PayoutScheduleExecution.executed_at.desc()).limit(limit).all()
