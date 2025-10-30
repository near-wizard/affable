"""Service for generating PDF invoices."""

import logging
from datetime import datetime
from decimal import Decimal
from io import BytesIO
from typing import Optional

from sqlalchemy.orm import Session
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    PageBreak,
)

from app.models.billing import VendorInvoice
from app.models import Vendor

logger = logging.getLogger(__name__)


class InvoicePDFService:
    """Generate PDF invoices for download."""

    @staticmethod
    def generate_invoice_pdf(db: Session, invoice_id: int) -> Optional[bytes]:
        """
        Generate a PDF invoice.

        Args:
            db: Database session
            invoice_id: Invoice ID to generate PDF for

        Returns:
            PDF file bytes or None if invoice not found

        Raises:
            ValueError: If invoice generation fails
        """
        # Get invoice and related data
        invoice = db.query(VendorInvoice).filter_by(
            vendor_invoice_id=invoice_id
        ).first()

        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        # Get vendor info
        vendor = db.query(Vendor).filter_by(
            vendor_id=invoice.subscription.vendor_id
        ).first()

        if not vendor:
            raise ValueError(f"Vendor for invoice {invoice_id} not found")

        try:
            # Create PDF in memory
            pdf_buffer = BytesIO()
            doc = SimpleDocTemplate(
                pdf_buffer,
                pagesize=letter,
                rightMargin=0.5 * inch,
                leftMargin=0.5 * inch,
                topMargin=0.5 * inch,
                bottomMargin=0.5 * inch,
            )

            # Build PDF content
            elements = []
            styles = getSampleStyleSheet()

            # Custom styles
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#1f2937'),
                spaceAfter=30,
                fontName='Helvetica-Bold',
            )

            heading_style = ParagraphStyle(
                'CustomHeading',
                parent=styles['Heading2'],
                fontSize=12,
                textColor=colors.HexColor('#374151'),
                spaceAfter=6,
                fontName='Helvetica-Bold',
            )

            normal_style = ParagraphStyle(
                'CustomNormal',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#4b5563'),
                leading=14,
            )

            # Header: Invoice title
            elements.append(Paragraph('INVOICE', title_style))
            elements.append(Spacer(1, 0.2 * inch))

            # Company and invoice info table
            company_data = [
                [
                    Paragraph('<b>Bill From</b>', heading_style),
                    '',
                    Paragraph('<b>Invoice Details</b>', heading_style),
                ],
                [
                    Paragraph(
                        f"<b>{invoice.subscription.vendor.name}</b><br/>"
                        f"{invoice.subscription.vendor.email}",
                        normal_style,
                    ),
                    '',
                    Paragraph(
                        f"<b>Invoice #:</b> {invoice.invoice_number}<br/>"
                        f"<b>Date:</b> {invoice.created_at.strftime('%B %d, %Y')}<br/>"
                        f"<b>Period:</b> {invoice.billing_start_date.strftime('%b %d')} - "
                        f"{invoice.billing_end_date.strftime('%b %d, %Y')}<br/>"
                        f"<b>Status:</b> {invoice.status.value.upper()}",
                        normal_style,
                    ),
                ],
            ]

            company_table = Table(company_data, colWidths=[2.5 * inch, 0.5 * inch, 2.5 * inch])
            company_table.setStyle(
                TableStyle(
                    [
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 11),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('GRID', (0, 0), (-1, -1), 0, colors.transparent),
                    ]
                )
            )

            elements.append(company_table)
            elements.append(Spacer(1, 0.3 * inch))

            # Line items table
            items_data = [
                [
                    Paragraph('<b>Description</b>', heading_style),
                    Paragraph('<b>Amount</b>', heading_style),
                ],
                [
                    Paragraph('Subscription Fee (Base)', normal_style),
                    Paragraph(
                        f"${float(invoice.subtotal):.2f}",
                        normal_style,
                    ),
                ],
            ]

            # Add GMV info if available
            gmv_fees = invoice.subscription.gmv_fees
            if gmv_fees:
                for gmv_fee in gmv_fees:
                    items_data.append(
                        [
                            Paragraph(
                                f"GMV Fee ({invoice.subscription.plan.gmv_percentage}%)",
                                normal_style,
                            ),
                            Paragraph(
                                f"${float(gmv_fee.fee_amount or 0):.2f}",
                                normal_style,
                            ),
                        ]
                    )

            items_data.append(
                [
                    Paragraph('Tax', normal_style),
                    Paragraph(
                        f"${float(invoice.tax_amount):.2f}",
                        normal_style,
                    ),
                ]
            )

            if invoice.adjustment_amount != Decimal('0.00'):
                items_data.append(
                    [
                        Paragraph('Adjustments', normal_style),
                        Paragraph(
                            f"${float(invoice.adjustment_amount):.2f}",
                            normal_style,
                        ),
                    ]
                )

            items_table = Table(items_data, colWidths=[4.5 * inch, 1.5 * inch])
            items_table.setStyle(
                TableStyle(
                    [
                        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 10),
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
                        ('TOPPADDING', (0, 0), (-1, -1), 8),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                    ]
                )
            )

            elements.append(items_table)
            elements.append(Spacer(1, 0.2 * inch))

            # Total section
            total_data = [
                [
                    Paragraph('<b>Total Amount Due</b>', heading_style),
                    Paragraph(
                        f"<b>${float(invoice.total_amount):.2f}</b>",
                        ParagraphStyle(
                            'TotalAmount',
                            parent=normal_style,
                            fontSize=14,
                            textColor=colors.HexColor('#1f2937'),
                            fontName='Helvetica-Bold',
                        ),
                    ),
                ],
            ]

            if invoice.paid_at:
                total_data.append(
                    [
                        Paragraph('Paid on', normal_style),
                        Paragraph(
                            invoice.paid_at.strftime('%B %d, %Y'),
                            normal_style,
                        ),
                    ]
                )

            total_table = Table(total_data, colWidths=[4.5 * inch, 1.5 * inch])
            total_table.setStyle(
                TableStyle(
                    [
                        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 11),
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dbeafe')),
                        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#bfdbfe')),
                        ('TOPPADDING', (0, 0), (-1, -1), 10),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                    ]
                )
            )

            elements.append(total_table)
            elements.append(Spacer(1, 0.4 * inch))

            # Footer
            footer_text = (
                f"Thank you for your business. "
                f"Next billing date: {invoice.subscription.next_billing_date.strftime('%B %d, %Y')}"
            )
            elements.append(Paragraph(footer_text, normal_style))

            # Generate PDF
            doc.build(elements)
            pdf_buffer.seek(0)

            logger.info(f"Generated PDF for invoice {invoice_id}")
            return pdf_buffer.getvalue()

        except Exception as e:
            logger.error(f"Error generating PDF for invoice {invoice_id}: {str(e)}")
            raise ValueError(f"Failed to generate PDF: {str(e)}")

    @staticmethod
    def generate_invoice_html(invoice: VendorInvoice) -> str:
        """
        Generate HTML representation of invoice (for preview/email).

        Args:
            invoice: VendorInvoice object

        Returns:
            HTML string
        """
        html = f"""
        <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; color: #333; }}
                    .container {{ max-width: 800px; margin: 0 auto; padding: 20px; }}
                    .header {{ border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 20px; }}
                    .title {{ font-size: 28px; font-weight: bold; color: #1f2937; }}
                    .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }}
                    .info-block {{ padding: 15px; background: #f3f4f6; border-radius: 8px; }}
                    .info-label {{ font-weight: bold; color: #374151; font-size: 12px; text-transform: uppercase; }}
                    .info-value {{ font-size: 14px; margin-top: 5px; }}
                    table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
                    th {{ background: #f3f4f6; padding: 10px; text-align: left; font-weight: bold; border-bottom: 1px solid #d1d5db; }}
                    td {{ padding: 10px; border-bottom: 1px solid #e5e7eb; }}
                    .total-section {{ background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
                    .total-row {{ display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; }}
                    .footer {{ font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="title">INVOICE</div>
                    </div>

                    <div class="info-grid">
                        <div class="info-block">
                            <div class="info-label">Bill From</div>
                            <div class="info-value">{invoice.subscription.vendor.name}</div>
                            <div class="info-value">{invoice.subscription.vendor.email}</div>
                        </div>
                        <div class="info-block">
                            <div class="info-label">Invoice #</div>
                            <div class="info-value">{invoice.invoice_number}</div>
                            <div class="info-label" style="margin-top: 10px;">Date</div>
                            <div class="info-value">{invoice.created_at.strftime('%B %d, %Y')}</div>
                        </div>
                    </div>

                    <table>
                        <tr>
                            <th>Description</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                        <tr>
                            <td>Subscription Fee (Base)</td>
                            <td style="text-align: right;">${float(invoice.subtotal):.2f}</td>
                        </tr>
                        <tr>
                            <td>Tax</td>
                            <td style="text-align: right;">${float(invoice.tax_amount):.2f}</td>
                        </tr>
                        {f'<tr><td>Adjustments</td><td style="text-align: right;">${float(invoice.adjustment_amount):.2f}</td></tr>' if invoice.adjustment_amount != Decimal('0.00') else ''}
                    </table>

                    <div class="total-section">
                        <div class="total-row">
                            <span>Total Amount Due</span>
                            <span>${float(invoice.total_amount):.2f}</span>
                        </div>
                    </div>

                    <div class="footer">
                        <p>Thank you for your business. Next billing date: {invoice.subscription.next_billing_date.strftime('%B %d, %Y')}</p>
                    </div>
                </div>
            </body>
        </html>
        """
        return html
