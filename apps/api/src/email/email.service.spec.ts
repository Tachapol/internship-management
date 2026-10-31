import { EmailService } from './email.service';

const mockSend = jest.fn();
jest.mock('resend', () => ({ Resend: class { emails = { send: mockSend }; } }));

function service(key = 're_test_key', from = 'DevPlus <noreply@example.test>') {
  const config = { RESEND_API_KEY: key, EMAIL_FROM: from, FRONTEND_URL: 'https://app.example.test/' };
  return new EmailService({ get: name => config[name] } as any);
}

describe('Notification email delivery', () => {
  beforeEach(() => mockSend.mockReset());
  it('reports configuration without claiming the domain was externally verified', () => {
    expect(service().getDeliveryStatus()).toEqual({ configured: true, senderDomain: 'example.test' });
    expect(service('re_123456789').getDeliveryStatus().configured).toBe(false);
    expect(service('re_test_key', 'DevPlus <onboarding@resend.dev>').getDeliveryStatus().configured).toBe(false);
  });
  it('does not transmit when email is unconfigured', async () => {
    expect(await service('re_123456789').sendNotificationEmail('recipient@example.test', 'Test')).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });
  it('sends a sign-in link and only reports acceptance with an email id', async () => {
    mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });
    expect(await service().sendNotificationEmail('recipient@example.test', 'Test')).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('https://app.example.test/notifications') }));
  });
  it.each([{ data: null, error: { message: 'rejected' } }, { data: null, error: null }])('reports rejection as failure', async response => {
    mockSend.mockResolvedValue(response);
    expect(await service().sendNotificationEmail('recipient@example.test', 'Test')).toBe(false);
  });
});
