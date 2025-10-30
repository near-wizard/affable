"""Service for generating professional PDF invoices with Affable branding."""

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
    HRFlowable,
)
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

from app.models.billing import VendorInvoice
from app.models import Vendor

logger = logging.getLogger(__name__)


class InvoicePDFService:
    """Generate PDF invoices for download."""

    @staticmethod
    def generate_invoice_pdf(db: Session, invoice_id: int) -> Optional[bytes]:
        """
        Generate a professional PDF invoice with Affable branding.

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
            # Create PDF in memory with custom page template
            pdf_buffer = BytesIO()

            class InvoiceDocTemplate(SimpleDocTemplate):
                def __init__(self, *args, **kwargs):
                    super().__init__(*args, **kwargs)

                def build(self, flowables, onFirstPage=None, onLaterPages=None, canvasmaker=None):
                    return super().build(flowables, onFirstPage=self._letterhead, onLaterPages=self._letterhead, canvasmaker=canvasmaker)

                def _letterhead(self, canvas, doc):
                    """Add Affable letterhead to each page."""
                    # Save canvas state
                    canvas.saveState()

                    # Colors
                    primary_color = colors.HexColor('#3b82f6')  # Blue
                    secondary_color = colors.HexColor('#1f2937')  # Dark gray

                    # Top banner
                    canvas.setFillColor(primary_color)
                    canvas.rect(0, letter[1] - 0.8 * inch, letter[0], 0.8 * inch, fill=1, stroke=0)

                    # Company name and logo area
                    canvas.setFont('Helvetica-Bold', 24)
                    canvas.setFillColor(colors.white)
                    canvas.drawString(0.5 * inch, letter[1] - 0.5 * inch, 'Affable')

                    # Tagline
                    canvas.setFont('Helvetica', 9)
                    canvas.setFillColor(colors.HexColor('#bfdbfe'))
                    canvas.drawString(0.5 * inch, letter[1] - 0.65 * inch, 'Commission & Affiliate Management Platform')

                    # Horizontal line
                    canvas.setStrokeColor(colors.HexColor('#e5e7eb'))
                    canvas.setLineWidth(1)
                    canvas.line(0.5 * inch, letter[1] - 0.85 * inch, letter[0] - 0.5 * inch, letter[1] - 0.85 * inch)

                    # Footer
                    footer_y = 0.4 * inch
                    canvas.setFont('Helvetica', 8)
                    canvas.setFillColor(colors.HexColor('#6b7280'))

                    footer_text = [
                        "Affable Commission Management Platform",
                        f"Invoice #{invoice.invoice_number} • Generated: {datetime.utcnow().strftime('%B %d, %Y')}",
                        "© 2024 Affable. All rights reserved."
                    ]

                    y_pos = footer_y
                    for text in footer_text:
                        canvas.drawString(0.5 * inch, y_pos, text)
                        y_pos -= 0.15 * inch

                    # Horizontal line before footer
                    canvas.setStrokeColor(colors.HexColor('#e5e7eb'))
                    canvas.line(0.5 * inch, footer_y + 0.1 * inch, letter[0] - 0.5 * inch, footer_y + 0.1 * inch)

                    # Restore canvas state
                    canvas.restoreState()

            doc = InvoiceDocTemplate(
                pdf_buffer,
                pagesize=letter,
                rightMargin=0.5 * inch,
                leftMargin=0.5 * inch,
                topMargin=1.2 * inch,
                bottomMargin=0.7 * inch,
            )

            # Build PDF content
            elements = []
            styles = getSampleStyleSheet()

            # Custom styles
            title_style = ParagraphStyle(
                'InvoiceTitle',
                parent=styles['Heading1'],
                fontSize=28,
                textColor=colors.HexColor('#1f2937'),
                spaceAfter=12,
                fontName='Helvetica-Bold',
            )

            section_heading_style = ParagraphStyle(
                'SectionHeading',
                parent=styles['Heading2'],
                fontSize=11,
                textColor=colors.HexColor('#374151'),
                spaceAfter=8,
                fontName='Helvetica-Bold',
                textTransform='uppercase',
            )

            label_style = ParagraphStyle(
                'Label',
                parent=styles['Normal'],
                fontSize=8,
                textColor=colors.HexColor('#6b7280'),
                spaceAfter=2,
                fontName='Helvetica-Bold',
                textTransform='uppercase',
            )

            info_style = ParagraphStyle(
                'Info',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#1f2937'),
                leading=14,
            )

            table_heading_style = ParagraphStyle(
                'TableHeading',
                parent=styles['Heading2'],
                fontSize=10,
                textColor=colors.white,
                spaceAfter=6,
                fontName='Helvetica-Bold',
            )

            normal_style = ParagraphStyle(
                'Normal',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#4b5563'),
                leading=12,
            )

            # Invoice title
            elements.append(Paragraph('INVOICE', title_style))
            elements.append(Spacer(1, 0.15 * inch))

            # Bill To and Invoice Details Side-by-side
            bill_to_text = f"""
            <b>BILL TO</b><br/>
            <font size="11"><b>{invoice.subscription.vendor.name}</b></font><br/>
            {invoice.subscription.vendor.email if invoice.subscription.vendor.email else 'No email'}
            """

            invoice_details = f"""
            <b>INVOICE DETAILS</b><br/>
            <b>Invoice Number:</b> {invoice.invoice_number}<br/>
            <b>Invoice Date:</b> {invoice.created_at.strftime('%B %d, %Y')}<br/>
            <b>Period:</b> {invoice.billing_start_date.strftime('%b %d, %Y')} – {invoice.billing_end_date.strftime('%b %d, %Y')}<br/>
            <b>Status:</b> <font color="#{('22c55e' if invoice.status.value == 'paid' else 'ef4444')}">{invoice.status.value.upper()}</font>
            """

            header_table_data = [
                [
                    Paragraph(bill_to_text, info_style),
                    Paragraph(invoice_details, info_style),
                ]
            ]

            header_table = Table(header_table_data, colWidths=[3.2 * inch, 3.2 * inch])
            header_table.setStyle(
                TableStyle(
                    [
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('GRID', (0, 0), (-1, -1), 0, colors.transparent),
                    ]
                )
            )

            elements.append(header_table)
            elements.append(Spacer(1, 0.25 * inch))

            # Line items table
            items_data = [
                [
                    Paragraph('Description', table_heading_style),
                    Paragraph('Amount', table_heading_style),
                ],
            ]

            # Base subscription fee
            items_data.append(
                [
                    Paragraph('Subscription Fee (Base)', normal_style),
                    Paragraph(
                        f"${float(invoice.subtotal):.2f}",
                        normal_style,
                    ),
                ]
            )

            # Add GMV fees if available
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

            # Tax
            items_data.append(
                [
                    Paragraph('Sales Tax', normal_style),
                    Paragraph(
                        f"${float(invoice.tax_amount):.2f}",
                        normal_style,
                    ),
                ]
            )

            # Adjustments if any
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

            items_table = Table(items_data, colWidths=[4.7 * inch, 1.7 * inch])
            items_table.setStyle(
                TableStyle(
                    [
                        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 10),
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
                        ('TOPPADDING', (0, 0), (-1, -1), 10),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                        ('LEFTPADDING', (0, 0), (-1, -1), 10),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                    ]
                )
            )

            elements.append(items_table)
            elements.append(Spacer(1, 0.25 * inch))

            # Total section - styled like a card
            total_amount = float(invoice.total_amount)
            total_text = f"${total_amount:.2f}"

            total_data = [
                [
                    Paragraph('TOTAL AMOUNT DUE', ParagraphStyle(
                        'TotalLabel',
                        parent=normal_style,
                        fontSize=10,
                        textColor=colors.white,
                        fontName='Helvetica-Bold',
                    )),
                    Paragraph(total_text, ParagraphStyle(
                        'TotalAmount',
                        parent=normal_style,
                        fontSize=18,
                        textColor=colors.white,
                        fontName='Helvetica-Bold',
                    )),
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

            total_table = Table(total_data, colWidths=[4.7 * inch, 1.7 * inch])
            total_table.setStyle(
                TableStyle(
                    [
                        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#3b82f6')),
                        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
                        ('GRID', (0, 0), (-1, -1), 0, colors.transparent),
                        ('TOPPADDING', (0, 0), (-1, -1), 12),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                        ('LEFTPADDING', (0, 0), (-1, -1), 10),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                    ]
                )
            )

            elements.append(total_table)
            elements.append(Spacer(1, 0.25 * inch))

            # Notes
            notes_text = f"<b>Next Billing Date:</b> {invoice.subscription.next_billing_date.strftime('%B %d, %Y')}"
            elements.append(Paragraph(notes_text, normal_style))

            elements.append(Spacer(1, 0.1 * inch))

            thank_you = "Thank you for your business!"
            elements.append(Paragraph(thank_you, ParagraphStyle(
                'ThankYou',
                parent=normal_style,
                fontSize=9,
                textColor=colors.HexColor('#6b7280'),
                alignment=0,
            )))

            # Generate PDF
            doc.build(elements)
            pdf_buffer.seek(0)

            logger.info(f"Generated professional PDF invoice for invoice {invoice_id}")
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
