"""
Unit Tests for Commission Calculation Logic

Tests commission calculation with various structures and overrides.
No database required - pure logic tests.
"""

import pytest
from decimal import Decimal
from typing import Tuple


class CommissionCalculator:
    """Mock commission calculator for testing logic."""

    @staticmethod
    def calculate_percentage_commission(
        event_value: Decimal,
        percentage: Decimal
    ) -> Decimal:
        """Calculate percentage-based commission."""
        if event_value < 0:
            raise ValueError("Event value cannot be negative")
        if not 0 <= percentage <= 100:
            raise ValueError("Percentage must be between 0 and 100")

        return (event_value * percentage / Decimal(100)).quantize(Decimal("0.01"))

    @staticmethod
    def calculate_fixed_commission(
        event_value: Decimal,
        fixed_amount: Decimal
    ) -> Decimal:
        """Calculate fixed commission."""
        if fixed_amount < 0:
            raise ValueError("Fixed amount cannot be negative")

        return fixed_amount.quantize(Decimal("0.01"))

    @staticmethod
    def calculate_tiered_commission(
        event_value: Decimal,
        tiers: list
    ) -> Tuple[Decimal, str]:
        """
        Calculate commission based on tiered structure.

        tiers: List of (min_amount, max_amount, commission_type, commission_value)
        Returns: (commission_amount, tier_used)
        """
        for tier in sorted(tiers, key=lambda x: x[0]):
            min_amount, max_amount, commission_type, commission_value = tier

            if min_amount <= event_value <= max_amount:
                if commission_type == "percentage":
                    commission = CommissionCalculator.calculate_percentage_commission(
                        event_value, commission_value
                    )
                else:  # fixed
                    commission = CommissionCalculator.calculate_fixed_commission(
                        event_value, commission_value
                    )
                tier_name = f"{min_amount}-{max_amount}"
                return commission, tier_name

        # If no tier matched, use last tier or raise
        raise ValueError(f"Event value {event_value} outside all tier ranges")

    @staticmethod
    def apply_commission_hierarchy(
        event_value: Decimal,
        partner_override: dict = None,  # {"type": "percentage", "value": 15}
        active_rules: list = None,      # [{"type": "percentage", "value": 12}]
        tiers: list = None,
        default_commission: dict = None
    ) -> Decimal:
        """
        Calculate commission using priority hierarchy:
        1. Partner-specific override
        2. Active commission rules
        3. Tiered structures
        4. Default campaign commission
        """
        # Priority 1: Partner override
        if partner_override:
            if partner_override["type"] == "percentage":
                return CommissionCalculator.calculate_percentage_commission(
                    event_value, partner_override["value"]
                )
            else:  # fixed
                return CommissionCalculator.calculate_fixed_commission(
                    event_value, partner_override["value"]
                )

        # Priority 2: Active rules
        if active_rules:
            rule = active_rules[0]  # Simplified - just first rule
            if rule["type"] == "percentage":
                return CommissionCalculator.calculate_percentage_commission(
                    event_value, rule["value"]
                )

        # Priority 3: Tiers
        if tiers:
            commission, _ = CommissionCalculator.calculate_tiered_commission(
                event_value, tiers
            )
            return commission

        # Priority 4: Default
        if default_commission:
            if default_commission["type"] == "percentage":
                return CommissionCalculator.calculate_percentage_commission(
                    event_value, default_commission["value"]
                )
            else:  # fixed
                return CommissionCalculator.calculate_fixed_commission(
                    event_value, default_commission["value"]
                )

        return Decimal("0.00")


class TestPercentageCommission:
    """Test percentage-based commission calculation."""

    def test_basic_percentage(self):
        """Test basic percentage calculation."""
        calc = CommissionCalculator()

        result = calc.calculate_percentage_commission(
            Decimal("100.00"),
            Decimal("10")
        )

        assert result == Decimal("10.00")

    @pytest.mark.parametrize("event_value,percentage,expected", [
        (Decimal("100.00"), Decimal("10"), Decimal("10.00")),
        (Decimal("50.00"), Decimal("20"), Decimal("10.00")),
        (Decimal("1000.00"), Decimal("5"), Decimal("50.00")),
        (Decimal("99.99"), Decimal("15"), Decimal("15.00")),
        (Decimal("0.01"), Decimal("50"), Decimal("0.00")),
    ])
    def test_percentage_various_amounts(self, event_value, percentage, expected):
        """Test percentage with various amounts."""
        calc = CommissionCalculator()

        result = calc.calculate_percentage_commission(event_value, percentage)

        assert result == expected

    def test_zero_percentage(self):
        """Test zero percentage results in zero commission."""
        calc = CommissionCalculator()

        result = calc.calculate_percentage_commission(
            Decimal("100.00"),
            Decimal("0")
        )

        assert result == Decimal("0.00")

    def test_full_percentage(self):
        """Test 100% commission."""
        calc = CommissionCalculator()

        result = calc.calculate_percentage_commission(
            Decimal("100.00"),
            Decimal("100")
        )

        assert result == Decimal("100.00")

    def test_negative_event_value_fails(self):
        """Test that negative event value raises error."""
        calc = CommissionCalculator()

        with pytest.raises(ValueError, match="cannot be negative"):
            calc.calculate_percentage_commission(
                Decimal("-100.00"),
                Decimal("10")
            )

    def test_invalid_percentage_fails(self):
        """Test that invalid percentages fail."""
        calc = CommissionCalculator()

        with pytest.raises(ValueError, match="between 0 and 100"):
            calc.calculate_percentage_commission(
                Decimal("100.00"),
                Decimal("150")
            )


class TestFixedCommission:
    """Test fixed-amount commission calculation."""

    @pytest.mark.parametrize("event_value,fixed_amount", [
        (Decimal("50.00"), Decimal("5.00")),
        (Decimal("100.00"), Decimal("10.00")),
        (Decimal("1000.00"), Decimal("25.00")),
        (Decimal("0.01"), Decimal("0.01")),
    ])
    def test_fixed_commission(self, event_value, fixed_amount):
        """Test fixed commission regardless of event value."""
        calc = CommissionCalculator()

        result = calc.calculate_fixed_commission(event_value, fixed_amount)

        assert result == fixed_amount.quantize(Decimal("0.01"))

    def test_fixed_commission_not_affected_by_event_value(self):
        """Test that event value doesn't affect fixed commission."""
        calc = CommissionCalculator()

        result1 = calc.calculate_fixed_commission(Decimal("100.00"), Decimal("5.00"))
        result2 = calc.calculate_fixed_commission(Decimal("1000.00"), Decimal("5.00"))

        assert result1 == result2 == Decimal("5.00")

    def test_negative_fixed_amount_fails(self):
        """Test that negative fixed amount raises error."""
        calc = CommissionCalculator()

        with pytest.raises(ValueError, match="cannot be negative"):
            calc.calculate_fixed_commission(
                Decimal("100.00"),
                Decimal("-5.00")
            )


class TestTieredCommission:
    """Test tiered commission calculation."""

    def test_basic_tiered_commission(self):
        """Test basic tiered structure."""
        calc = CommissionCalculator()

        tiers = [
            (Decimal("0"), Decimal("100"), "percentage", Decimal("5")),
            (Decimal("100.01"), Decimal("500"), "percentage", Decimal("10")),
            (Decimal("500.01"), Decimal("999999"), "percentage", Decimal("15")),
        ]

        # Event value in first tier
        commission, tier = calc.calculate_tiered_commission(
            Decimal("50.00"), tiers
        )
        assert commission == Decimal("2.50")
        assert "0-100" in tier

        # Event value in second tier
        commission, tier = calc.calculate_tiered_commission(
            Decimal("300.00"), tiers
        )
        assert commission == Decimal("30.00")

        # Event value in third tier
        commission, tier = calc.calculate_tiered_commission(
            Decimal("1000.00"), tiers
        )
        assert commission == Decimal("150.00")

    def test_tiered_with_fixed_amounts(self):
        """Test tiers with fixed commission amounts."""
        calc = CommissionCalculator()

        tiers = [
            (Decimal("0"), Decimal("100"), "fixed", Decimal("5.00")),
            (Decimal("100.01"), Decimal("500"), "fixed", Decimal("10.00")),
        ]

        commission, _ = calc.calculate_tiered_commission(
            Decimal("150.00"), tiers
        )

        assert commission == Decimal("10.00")

    def test_value_outside_tier_range_fails(self):
        """Test that values outside tier ranges fail."""
        calc = CommissionCalculator()

        tiers = [
            (Decimal("100"), Decimal("500"), "percentage", Decimal("10")),
        ]

        with pytest.raises(ValueError, match="outside all tier ranges"):
            calc.calculate_tiered_commission(
                Decimal("50.00"), tiers  # Below tier range
            )

    def test_edge_case_tier_boundaries(self):
        """Test edge cases at tier boundaries."""
        calc = CommissionCalculator()

        tiers = [
            (Decimal("0"), Decimal("100"), "percentage", Decimal("5")),
            (Decimal("100.01"), Decimal("500"), "percentage", Decimal("10")),
        ]

        # Exactly at lower boundary
        commission, _ = calc.calculate_tiered_commission(
            Decimal("0.00"), tiers
        )
        assert commission == Decimal("0.00")

        # Exactly at upper boundary of tier 1
        commission, _ = calc.calculate_tiered_commission(
            Decimal("100.00"), tiers
        )
        assert commission == Decimal("5.00")

        # Just above tier 1
        commission, _ = calc.calculate_tiered_commission(
            Decimal("100.01"), tiers
        )
        assert commission == Decimal("10.00")


class TestCommissionHierarchy:
    """Test commission calculation with priority hierarchy."""

    def test_partner_override_takes_priority(self):
        """Test that partner override has highest priority."""
        calc = CommissionCalculator()

        result = calc.apply_commission_hierarchy(
            Decimal("100.00"),
            partner_override={"type": "percentage", "value": Decimal("25")},
            active_rules=[{"type": "percentage", "value": Decimal("10")}],
            default_commission={"type": "percentage", "value": Decimal("5")}
        )

        assert result == Decimal("25.00")

    def test_active_rules_second_priority(self):
        """Test that active rules are second priority."""
        calc = CommissionCalculator()

        result = calc.apply_commission_hierarchy(
            Decimal("100.00"),
            partner_override=None,
            active_rules=[{"type": "percentage", "value": Decimal("15")}],
            default_commission={"type": "percentage", "value": Decimal("5")}
        )

        assert result == Decimal("15.00")

    def test_tiers_third_priority(self):
        """Test that tiers are third priority."""
        calc = CommissionCalculator()

        tiers = [
            (Decimal("0"), Decimal("500"), "percentage", Decimal("20")),
        ]

        result = calc.apply_commission_hierarchy(
            Decimal("100.00"),
            partner_override=None,
            active_rules=None,
            tiers=tiers,
            default_commission={"type": "percentage", "value": Decimal("5")}
        )

        assert result == Decimal("20.00")

    def test_default_commission_fallback(self):
        """Test that default commission is used as fallback."""
        calc = CommissionCalculator()

        result = calc.apply_commission_hierarchy(
            Decimal("100.00"),
            default_commission={"type": "percentage", "value": Decimal("10")}
        )

        assert result == Decimal("10.00")

    def test_no_commission_configured(self):
        """Test zero commission when nothing configured."""
        calc = CommissionCalculator()

        result = calc.apply_commission_hierarchy(Decimal("100.00"))

        assert result == Decimal("0.00")

    def test_mixed_fixed_and_percentage(self):
        """Test mixing fixed and percentage across hierarchy."""
        calc = CommissionCalculator()

        result = calc.apply_commission_hierarchy(
            Decimal("100.00"),
            partner_override=None,
            active_rules=None,
            default_commission={"type": "fixed", "value": Decimal("10.00")}
        )

        assert result == Decimal("10.00")


class TestCommissionRounding:
    """Test commission rounding and precision."""

    def test_rounding_to_two_decimals(self):
        """Test that commissions are rounded to 2 decimal places."""
        calc = CommissionCalculator()

        result = calc.calculate_percentage_commission(
            Decimal("33.33"),
            Decimal("10")  # 33.33 * 10% = 3.333
        )

        # Should round to 2 decimals
        assert result == Decimal("3.33")
        assert str(result).count(".") == 1
        assert len(str(result).split(".")[1]) == 2

    @pytest.mark.parametrize("event_value,percentage", [
        (Decimal("1.01"), Decimal("33")),  # Weird rounding case
        (Decimal("99.99"), Decimal("7")),   # Another rounding case
        (Decimal("0.01"), Decimal("99")),   # Near-zero case
    ])
    def test_rounding_precision(self, event_value, percentage):
        """Test rounding precision in various cases."""
        calc = CommissionCalculator()

        result = calc.calculate_percentage_commission(event_value, percentage)

        # Check that result has at most 2 decimal places
        result_str = str(result)
        if "." in result_str:
            decimals = len(result_str.split(".")[1])
            assert decimals <= 2
