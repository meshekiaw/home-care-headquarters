import * as React from 'npm:react@18.3.1';
import { TrainingLinkEmail, type TrainingLinkProps } from './training-link.tsx';
export const SignupEmail = (props: TrainingLinkProps & { siteUrl?: string; recipient?: string }) => <TrainingLinkEmail {...props} confirmEmail />;
export default SignupEmail;
