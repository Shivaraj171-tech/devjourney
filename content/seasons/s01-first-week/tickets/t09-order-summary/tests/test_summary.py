from app.summary import order_summary


def check(prices, promo_code, expected_lines):
    result = order_summary(prices, promo_code)
    expected = "\n".join(expected_lines)
    assert result == expected, (
        f"order_summary({prices}, {promo_code!r}) should be:\n{expected}\n\ngot:\n{result}"
    )


def test_big_order_with_promo_code():
    check([1250, 1250, 299], "ORBIT20", [
        "Subtotal: $27.99",
        "Discount: $5.59",
        "Delivery: $0.00",
        "Total: $22.40",
    ])


def test_small_order_without_code_pays_delivery():
    check([1250], None, [
        "Subtotal: $12.50",
        "Discount: $0.00",
        "Delivery: $3.99",
        "Total: $16.49",
    ])


def test_promo_code_with_delivery_fee():
    check([1250, 450], "welcome10", [
        "Subtotal: $17.00",
        "Discount: $1.70",
        "Delivery: $3.99",
        "Total: $19.29",
    ])


def test_promo_code_is_optional():
    result = order_summary([1250])
    assert result.endswith("Total: $16.49"), f"order_summary([1250]) should end with 'Total: $16.49', got:\n{result}"
