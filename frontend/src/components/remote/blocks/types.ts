export type RemoteControl = {
  label: string;
  buttonText?: string | null;
  role?: string;
  disabled?: boolean;
  onPress: () => void;
};
