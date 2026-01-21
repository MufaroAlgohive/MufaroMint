import React from "react";

const MorePage = () => {
  const getRandomBuffer = (length) => {
    const buffer = new Uint8Array(length);
    window.crypto.getRandomValues(buffer);
    return buffer;
  };

  const handleSetupBiometrics = async () => {
    if (!window.PublicKeyCredential) {
      window.alert("Biometrics are not supported on this device.");
      return;
    }

    try {
      const isAvailable = await window.PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable();

      if (!isAvailable) {
        window.alert("Face ID is not available on this device.");
        return;
      }

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: getRandomBuffer(32),
          rp: { name: "Mint" },
          user: {
            id: getRandomBuffer(16),
            name: "mint-user",
            displayName: "Mint User",
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
          attestation: "none",
        },
      });

      if (credential) {
        localStorage.setItem("biometricsEnabled", "true");
        window.alert("Face ID has been enabled.");
      }
    } catch (error) {
      console.error("Failed to enable biometrics", error);
      window.alert("Unable to enable Face ID. Please try again.");
    }
  };

  const menuItems = [
    { id: "profile", label: "Profile Details" },
    { id: "kyc", label: "KYC Status" },
    { id: "banks", label: "Linked Bank Accounts" },
    { id: "settings", label: "Settings" },
    { id: "biometrics", label: "Setup Biometrics", onClick: handleSetupBiometrics },
    { id: "preferences", label: "Preferences" },
    { id: "help", label: "Help & FAQs" },
    { id: "legal", label: "Legal" },
    { id: "privacy", label: "Privacy" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
      <h1 className="mb-8 text-3xl font-semibold text-slate-900">More</h1>
      <div className="space-y-2">
        {menuItems.map((item) => (
          <button 
            key={item.id}
            onClick={item.onClick}
            className="w-full rounded-2xl bg-white p-5 text-left font-medium text-slate-700 shadow-sm transition active:scale-95"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// THIS IS THE MISSING LINE:
export default MorePage;
