(() => {
  const storageKey = "cupcakesPitCookiePreferences";
  const banner = document.getElementById("cookie-banner");
  const bannerError = document.getElementById("cookie-banner-error");
  const preferencesDialog = document.getElementById("cookie-preferences");
  const preferencesError = document.getElementById("cookie-preferences-error");
  const analyticsCheckbox = document.getElementById("cookie-analytics");
  const marketingCheckbox = document.getElementById("cookie-marketing");
  const settingsButton = document.getElementById("cookie-settings");

  function readPreferences() {
    let storedValue;
    try {
      storedValue = window.localStorage.getItem(storageKey);
    } catch (error) {
      console.error("Could not read cookie preferences from local storage.", error);
      return null;
    }

    if (storedValue === null) return null;

    try {
      const preferences = JSON.parse(storedValue);
      if (
        preferences &&
        preferences.necessary === true &&
        typeof preferences.analytics === "boolean" &&
        typeof preferences.marketing === "boolean"
      ) {
        return preferences;
      }
    } catch (error) {
      console.error("Saved cookie preferences are not valid JSON.", error);
      return null;
    }

    console.error("Saved cookie preferences have an unexpected format.");
    return null;
  }

  let savedPreferences = readPreferences();
  banner.hidden = savedPreferences !== null;
  settingsButton.hidden = savedPreferences === null;

  function showPreferences() {
    bannerError.hidden = true;
    preferencesError.hidden = true;
    analyticsCheckbox.checked = savedPreferences ? savedPreferences.analytics : false;
    marketingCheckbox.checked = savedPreferences ? savedPreferences.marketing : false;
    preferencesDialog.showModal();
  }

  function savePreferences(preferences, source) {
    bannerError.hidden = true;
    preferencesError.hidden = true;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch (error) {
      console.error("Could not save cookie preferences to local storage.", error);
      if (source === "banner") {
        bannerError.hidden = false;
      } else {
        preferencesError.hidden = false;
      }
      return;
    }

    savedPreferences = preferences;
    banner.hidden = true;
    settingsButton.hidden = false;
    if (preferencesDialog.open) preferencesDialog.close();
  }

  document.getElementById("cookie-accept").addEventListener("click", () => {
    savePreferences(
      { necessary: true, analytics: true, marketing: true },
      "banner"
    );
  });

  document.getElementById("cookie-decline").addEventListener("click", () => {
    savePreferences(
      { necessary: true, analytics: false, marketing: false },
      "banner"
    );
  });

  document.getElementById("cookie-manage").addEventListener("click", showPreferences);
  settingsButton.addEventListener("click", showPreferences);
  document.getElementById("cookie-cancel").addEventListener("click", () => {
    preferencesDialog.close();
  });

  document.getElementById("cookie-save").addEventListener("click", () => {
    savePreferences(
      {
        necessary: true,
        analytics: analyticsCheckbox.checked,
        marketing: marketingCheckbox.checked
      },
      "preferences"
    );
  });
})();
