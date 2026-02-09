import AuthLayout from '../components/AuthLayout.jsx';
import AuthForm from '../components/AuthForm.jsx';

const AuthPage = ({ initialStep, onSignupComplete, onLoginComplete, onPreLogin }) => (
  <AuthLayout>
    <AuthForm
      initialStep={initialStep}
      onSignupComplete={onSignupComplete}
      onLoginComplete={onLoginComplete}
      onPreLogin={onPreLogin}
    />
  </AuthLayout>
);

export default AuthPage;
