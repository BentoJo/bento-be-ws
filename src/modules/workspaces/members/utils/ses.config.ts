import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

type SesSendResult = {
  MessageId?: string;
};

interface SesClientLike {
  send(command: unknown): Promise<SesSendResult>;
}

type SesClientCtor = new (config: {
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}) => SesClientLike;

type SendEmailCommandCtor = new (input: {
  Source: string;
  Destination: {
    ToAddresses: string[];
  };
  Message: {
    Subject: {
      Data: string;
      Charset: 'UTF-8';
    };
    Body: {
      Html: {
        Data: string;
        Charset: 'UTF-8';
      };
    };
  };
}) => unknown;

const SESClientSafe = SESClient as unknown as SesClientCtor;
const SendEmailCommandSafe =
  SendEmailCommand as unknown as SendEmailCommandCtor;

const awsAccessKeyId = process.env.AWS_ACCESS_KEY ?? '';
const awsSecretAccessKey = process.env.AWS_SECRET_KEY ?? '';
const fromEmailAws = process.env.FROM_EMAIL_AWS ?? '';

const ses: SesClientLike = new SESClientSafe({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  },
});

export async function sendEmail(
  email: string,
  subject: string,
  bodyHtml: string,
): Promise<void> {
  const command: unknown = new SendEmailCommandSafe({
    Source: fromEmailAws,

    Destination: {
      ToAddresses: [email],
    },

    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        // HTML
        Html: {
          Data: bodyHtml,
          Charset: 'UTF-8',
        },
      },
    },
  });

  try {
    const response = await ses.send(command);
    console.log('✅ Email sent:', response.MessageId);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}
