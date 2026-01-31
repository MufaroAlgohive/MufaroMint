import React from "react";
import UserOnboardingPage from "./UserOnboardingPage";

const IdentityCheckPage = ({ onBack, onComplete }) => {
  return (
    <UserOnboardingPage 
      onBack={onBack} 
      onComplete={onComplete} 
    />
  );
};

export default IdentityCheckPage;
