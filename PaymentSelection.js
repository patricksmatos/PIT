(() => {
  const orderItems = document.getElementById("order-items");
  const orderTotal = document.getElementById("order-total");
  const emptyOrder = document.getElementById("empty-order");
  const orderError = document.getElementById("order-error");
  const paymentForm = document.getElementById("payment-form");
  const placeOrderButton = document.getElementById("place-order");
  const confirmationDialog = document.getElementById("order-confirmation");
  const confirmationItems = document.getElementById("confirmation-items");
  const confirmationOrderId = document.getElementById("confirmation-order-id");
  const confirmationMethod = document.getElementById("confirmation-method");
  const confirmationFulfillment = document.getElementById("confirmation-fulfillment");
  const confirmationTotal = document.getElementById("confirmation-total");
  const methodInfo = document.getElementById("method-info");
  const fulfillmentSummary = document.getElementById("fulfillment-summary");
  const fulfillment = new URLSearchParams(window.location.search).get("fulfillment");
  const methodInstructions = {
    "Credit card": "Credit or debit card selected for this order.",
    PIX: "PIX selected for this order.",
    Cash: "Cash selected for this order."
  };
  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  });

  if (fulfillment === "Pickup" || fulfillment === "Delivery") {
    fulfillmentSummary.textContent = `Fulfillment method: ${fulfillment}.`;
    fulfillmentSummary.hidden = false;
  }

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
  placeOrderButton.disabled = order.length === 0;

  paymentForm.addEventListener("change", () => {
    const selectedMethod = paymentForm.querySelector('input[name="payment-method"]:checked');
    if (!selectedMethod) return;

    methodInfo.textContent = methodInstructions[selectedMethod.value];
    methodInfo.hidden = false;
  });

  paymentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (order.length === 0) return;

    const selectedMethod = paymentForm.querySelector('input[name="payment-method"]:checked');
    if (!selectedMethod) return;

    const methodName = selectedMethod.closest(".payment-option").querySelector("strong").textContent;
    placeOrderButton.disabled = true;
    orderError.hidden = true;

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: order.map((item) => ({
            productId: item.productId,
            quantity: item.quantity
          })),
          fulfillment,
          paymentMethod: selectedMethod.value
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The order could not be saved.");

      confirmationItems.replaceChildren();
      result.items.forEach((item) => {
        const row = document.createElement("li");
        row.className = "order-item";
        const details = document.createElement("div");
        const name = document.createElement("div");
        name.className = "order-item-name";
        name.textContent = item.name;
        const quantity = document.createElement("div");
        quantity.className = "order-item-detail";
        quantity.textContent = `${item.quantity} × ${currency.format(item.unitPrice)}`;
        const price = document.createElement("span");
        price.className = "order-item-price";
        price.textContent = currency.format(item.lineTotal);
        details.append(name, quantity);
        row.append(details, price);
        confirmationItems.append(row);
      });
      confirmationOrderId.textContent = result.id;
      confirmationMethod.textContent = methodName;
      if (result.fulfillment === "Pickup") {
        confirmationFulfillment.textContent = "We are anxious waiting for you ❤️";
        confirmationFulfillment.hidden = false;
      } else if (result.fulfillment === "Delivery") {
        confirmationFulfillment.textContent = "We know where you are, don't worry. Your order is on its way ❤️";
        confirmationFulfillment.hidden = false;
      }
      confirmationTotal.textContent = currency.format(result.total);
      paymentForm.hidden = true;
      window.history.replaceState(null, "", window.location.pathname);
      confirmationDialog.showModal();
    } catch (error) {
      console.error("Could not save the order to the database.", error);
      orderError.textContent = "We couldn't save your order. Please try again.";
      orderError.hidden = false;
      placeOrderButton.disabled = false;
    }
  });

  document.getElementById("close-confirmation").addEventListener("click", () => {
    window.location.href = "MenuRegular.html";
  });
})();
