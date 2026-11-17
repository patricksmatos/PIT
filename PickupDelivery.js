(() => {
  const orderItems = document.getElementById("order-items");
  const orderTotal = document.getElementById("order-total");
  const emptyOrder = document.getElementById("empty-order");
  const orderError = document.getElementById("order-error");
  const fulfillmentForm = document.getElementById("fulfillment-form");
  const continueButton = document.getElementById("continue-button");
  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  });

  function readOrder() {
    const serializedOrder = new URLSearchParams(window.location.search).get("cart");
    if (serializedOrder === null) return [];

    let order;
    try {
      order = JSON.parse(serializedOrder);
    } catch (error) {
      console.error("Could not read the order from the checkout URL.", error);
      orderError.hidden = false;
      return [];
    }

    if (
      !Array.isArray(order) ||
      !order.every((item) =>
        item &&
        typeof item.productId === "string" &&
        typeof item.name === "string" &&
        item.name.trim() !== "" &&
        Number.isFinite(item.price) &&
        item.price > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
      )
    ) {
      console.error("The checkout URL contains invalid cart details.");
      orderError.hidden = false;
      return [];
    }

    return order;
  }

  const order = readOrder();
  const total = order.reduce((sum, item) => sum + item.price * item.quantity, 0);

  order.forEach((item) => {
    const row = document.createElement("li");
    row.className = "order-item";

    const details = document.createElement("div");
    const name = document.createElement("div");
    name.className = "order-item-name";
    name.textContent = item.name;

    const quantity = document.createElement("div");
    quantity.className = "order-item-detail";
    quantity.textContent = `${item.quantity} × ${currency.format(item.price)}`;

    const price = document.createElement("span");
    price.className = "order-item-price";
    price.textContent = currency.format(item.price * item.quantity);

    details.append(name, quantity);
    row.append(details, price);
    orderItems.append(row);
  });

  orderTotal.textContent = currency.format(total);
  emptyOrder.hidden = order.length !== 0;
  continueButton.disabled = order.length === 0;

  fulfillmentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (order.length === 0) return;

    const selectedMethod = fulfillmentForm.querySelector('input[name="fulfillment-method"]:checked');
    if (!selectedMethod) return;

    const paymentUrl = new URL("PaymentSelection.html", window.location.href);
    paymentUrl.searchParams.set("cart", JSON.stringify(order));
    paymentUrl.searchParams.set("fulfillment", selectedMethod.value);
    window.location.href = paymentUrl.href;
  });
})();
