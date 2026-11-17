(() => {
  const cart = new Map();
  const cartWrap = document.querySelector(".cart-wrap");
  const cartToggle = document.getElementById("cart-toggle");
  const cartPanel = document.getElementById("cart-panel");
  const cartCount = document.getElementById("cart-count");
  const cartItems = document.getElementById("cart-items");
  const cartEmpty = document.getElementById("cart-empty");
  const cartTotal = document.getElementById("cart-total");
  const checkoutButton = document.getElementById("cart-checkout");
  const cartStatus = document.getElementById("cart-status");

  const formatPrice = (amount) => `$${amount.toFixed(2)}`;

  function renderCart() {
    const itemCount = Array.from(cart.values()).reduce((sum, item) => sum + item.quantity, 0);
    const total = Array.from(cart.values()).reduce((sum, item) => sum + item.price * item.quantity, 0);

    cartCount.textContent = itemCount;
    cartCount.hidden = itemCount === 0;
    cartToggle.setAttribute(
      "aria-label",
      `Shopping cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
    );
    cartEmpty.hidden = itemCount !== 0;
    cartItems.replaceChildren();

    cart.forEach((item, name) => {
      const row = document.createElement("li");
      row.className = "cart-item";

      const details = document.createElement("div");
      details.className = "cart-item-details";

      const itemName = document.createElement("div");
      itemName.className = "cart-item-name";
      itemName.textContent = `${item.quantity} × ${item.name}`;

      const subtotal = document.createElement("div");
      subtotal.className = "cart-item-subtotal";
      subtotal.textContent = formatPrice(item.price * item.quantity);

      const removeButton = document.createElement("button");
      removeButton.className = "cart-remove";
      removeButton.type = "button";
      removeButton.dataset.removeProduct = name;
      removeButton.textContent = "Remove";
      removeButton.setAttribute("aria-label", `Remove ${item.name} from cart`);

      details.append(itemName, subtotal);
      row.append(details, removeButton);
      cartItems.append(row);
    });

    cartTotal.textContent = formatPrice(total);
    checkoutButton.disabled = itemCount === 0;
  }

  document.querySelector(".product-pane").addEventListener("click", (event) => {
    const button = event.target.closest(".add-btn");
    if (!button) return;

    const productId = button.dataset.productId;
    const productName = button.closest(".item").querySelector(".item-name").textContent.trim();
    const price = Number(button.dataset.price);
    const product = cart.get(productId) || { name: productName, price, quantity: 0 };
    product.quantity += 1;
    cart.set(productId, product);
    renderCart();
    cartStatus.textContent = `${productName} added to cart.`;

    button.textContent = "Added";
    window.setTimeout(() => {
      button.textContent = "Add";
    }, 900);
  });

  cartToggle.addEventListener("click", () => {
    const isOpen = !cartPanel.hidden;
    cartPanel.hidden = isOpen;
    cartToggle.setAttribute("aria-expanded", String(!isOpen));
  });

  checkoutButton.addEventListener("click", () => {
    if (cart.size === 0) return;

    const checkoutUrl = new URL("PickupDelivery.html", window.location.href);
    checkoutUrl.searchParams.set(
      "cart",
      JSON.stringify(
        Array.from(cart, ([productId, item]) => ({
          productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }))
      )
    );
    window.location.href = checkoutUrl.href;
  });

  cartItems.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-product]");
    if (!removeButton) return;

    event.stopPropagation();
    cart.delete(removeButton.dataset.removeProduct);
    renderCart();
  });

  document.addEventListener("click", (event) => {
    if (!cartWrap.contains(event.target) && !cartPanel.hidden) {
      cartPanel.hidden = true;
      cartToggle.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !cartPanel.hidden) {
      cartPanel.hidden = true;
      cartToggle.setAttribute("aria-expanded", "false");
      cartToggle.focus();
    }
  });

  renderCart();
})();