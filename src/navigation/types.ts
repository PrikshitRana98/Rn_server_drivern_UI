export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Sales: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  Onboarding: undefined;
  OTPVerification: {
    phoneNumber: string;
  };
};

export type MainStackParamList = {
  Home: undefined;
  Profile: undefined;
  Sdui: undefined;
  Settings: undefined;
}; 