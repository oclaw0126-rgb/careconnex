/**
 * Demo Credentials for Testing CareConnex
 * 
 * These are the default demo accounts that exist when seed data is created.
 * You can use these to test different user flows without signing up.
 * 
 * Run "Deploy Seed Data" from the Admin panel to create these accounts.
 */

export const DEMO_CREDENTIALS = {
  clients: [
    { email: 'maria.garcia@example.com', password: 'DemoPass123!', name: 'Maria Garcia' },
    { email: 'john.smith@example.com', password: 'DemoPass123!', name: 'John Smith' },
    { email: 'sarah.johnson@example.com', password: 'DemoPass123!', name: 'Sarah Johnson' },
    { email: 'david.williams@example.com', password: 'DemoPass123!', name: 'David Williams' },
    { email: 'lisa.brown@example.com', password: 'DemoPass123!', name: 'Lisa Brown' },
  ],
  caregivers: [
    { email: 'jennifer.miller@example.com', password: 'DemoPass123!', name: 'Jennifer Miller' },
    { email: 'robert.davis@example.com', password: 'DemoPass123!', name: 'Robert Davis' },
    { email: 'emily.rodriguez@example.com', password: 'DemoPass123!', name: 'Emily Rodriguez' },
    { email: 'james.martinez@example.com', password: 'DemoPass123!', name: 'James Martinez' },
    { email: 'emma.hernandez@example.com', password: 'DemoPass123!', name: 'Emma Hernandez' },
    { email: 'william.lopez@example.com', password: 'DemoPass123!', name: 'William Lopez' },
  ]
};

/**
 * Quick login helper for demo mode
 * Usage in components:
 * 
 * import { loginAsDemoUser, DEMO_CREDENTIALS } from '../config/demoCredentials';
 * 
 * // In your component:
 * const handleDemoLogin = async () => {
 *   await loginAsDemoUser('client', 0, authService.login);
 * };
 */
export const loginAsDemoUser = async (
  type: 'client' | 'caregiver',
  index: number,
  loginFn: (email: string, password: string, type: 'client' | 'caregiver') => Promise<any>
) => {
  const user = DEMO_CREDENTIALS[type === 'client' ? 'clients' : 'caregivers'][index];
  if (!user) throw new Error('Demo user not found');
  return loginFn(user.email, user.password, type);
};
