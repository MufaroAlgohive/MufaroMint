import AuthLayout from '../components/AuthLayout.jsx';
import AuthForm from '../components/AuthForm.jsx';

const AuthPage = ({ initialStep, onSignupComplete, onLoginComplete }) => (
  <AuthLayout>
    <AuthForm
      initialStep={initialStep}
      onSignupComplete={onSignupComplete}
      onLoginComplete={onLoginComplete}
    />
  </AuthLayout>
);

export default AuthPage;
