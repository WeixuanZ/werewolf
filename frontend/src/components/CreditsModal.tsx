import { Modal, Typography, Button, theme, ConfigProvider } from 'antd';
import { GithubOutlined, SoundOutlined } from '@ant-design/icons';

const { Text, Title, Link } = Typography;

interface CreditsModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreditsModal({ open, onClose }: CreditsModalProps) {
  const { token } = theme.useToken();

  const credits = [
    {
      title: 'Night Start Sound',
      desc: 'Drama inception braam orchestral hit 1',
      source: 'SoundMonster',
      url: 'https://github.com/jonjonsson/SoundMonster/tree/main/Public%20domain',
      license: 'CC0 1.0',
    },
    {
      title: 'Murder Reveal Sound',
      desc: 'Dramatic dun dun dunnn',
      source: 'copyc4t',
      url: 'https://freesound.org/people/copyc4t/sounds/146434/',
      license: 'CC BY 4.0',
    },
    {
      title: 'Game Over Sound',
      desc: 'Game over arcade',
      source: 'SimonBay',
      url: 'https://freesound.org/people/SimonBay/sounds/439890/',
      license: 'CC BY 3.0',
    },
    {
      title: 'Game Win Sound',
      desc: 'Procedurally generated Fanfare',
      source: 'Internal',
      url: '',
      license: 'Public Domain',
    },
  ];

  return (
    <ConfigProvider
      theme={{
        components: {
          Modal: {
            contentBg: 'transparent',
            headerBg: 'transparent',
            footerBg: 'transparent',
            boxShadow: 'none',
          },
        },
      }}
    >
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        width={380}
        closable={false}
        styles={{
          body: { padding: 0 },
        }}
        modalRender={(modal) => (
          <div
            style={{
              background: 'rgba(26, 17, 40, 0.98)',
              backdropFilter: 'blur(20px)',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
            }}
          >
            {modal}
          </div>
        )}
      >
        <div style={{ padding: '16px' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Title
              level={3}
              style={{ margin: 0, color: '#fff', fontSize: 24, letterSpacing: -0.5 }}
            >
              Credits
            </Title>
            <Button
              type="text"
              icon={<span style={{ fontSize: 24 }}>×</span>}
              onClick={onClose}
              style={{ color: 'rgba(255,255,255,0.4)', height: 32, width: 32, padding: 0 }}
            />
          </div>

          {/* Brand Card - Denser & Larger */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <Text
                  style={{
                    fontSize: 10,
                    color: token.colorPrimary,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 2,
                  }}
                >
                  Author
                </Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>WeixuanZ</Text>
              </div>
              <div>
                <Text
                  style={{
                    fontSize: 10,
                    color: token.colorPrimary,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 2,
                  }}
                >
                  License
                </Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>LGPL v3.0</Text>
              </div>
            </div>
            <Button
              type="primary"
              icon={<GithubOutlined />}
              href="https://github.com/WeixuanZ/werewolf"
              target="_blank"
              size="small"
              style={{
                background: '#fff',
                color: '#000',
                fontWeight: 600,
                border: 'none',
                height: 32,
                padding: '0 12px',
              }}
            >
              GitHub
            </Button>
          </div>

          {/* List Header */}
          <Text
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              display: 'block',
              marginBottom: 8,
              paddingLeft: 4,
            }}
          >
            Audio Library
          </Text>

          {/* Asset Cards - Readable & Dense */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {credits.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 4,
                  }}
                >
                  <Text strong style={{ fontSize: 16, color: '#fff' }}>
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.6)',
                      background: 'rgba(255,255,255,0.1)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      height: 'fit-content',
                    }}
                  >
                    {item.license}
                  </Text>
                </div>
                <Text
                  style={{
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.7)',
                    display: 'block',
                    marginBottom: 6,
                    lineHeight: 1.3,
                  }}
                >
                  {item.desc}
                </Text>
                {item.url && (
                  <Link
                    href={item.url}
                    target="_blank"
                    style={{
                      fontSize: 12,
                      color: token.colorPrimary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      opacity: 0.9,
                    }}
                  >
                    <SoundOutlined /> {item.source}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </ConfigProvider>
  );
}
