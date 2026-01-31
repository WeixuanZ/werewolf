import { Modal, Typography, List, Divider, Button, theme, Space } from 'antd';
import {
  GithubOutlined,
  SoundOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';

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
      description: 'Drama inception braam orchestral hit 1',
      source: 'SoundMonster Public Domain',
      sourceUrl: 'https://github.com/jonjonsson/SoundMonster/tree/main/Public%20domain',
      license: 'CC0 1.0',
      licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/',
    },
    {
      title: 'Murder Reveal Sound',
      description: 'Dramatic dun dun dunnn',
      source: 'copyc4t on Freesound.org',
      sourceUrl: 'https://freesound.org/people/copyc4t/sounds/146434/',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
    {
      title: 'Game Over Sound',
      description: 'Game over arcade',
      source: 'SimonBay on Freesound.org',
      sourceUrl: 'https://freesound.org/people/SimonBay/sounds/439890/',
      license: 'CC BY 3.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/3.0/',
    },
    {
      title: 'Game Win Sound',
      description: 'Procedurally generated C Major Fanfare',
      source: 'Generated via Python wave module',
      sourceUrl: '',
      license: 'Public Domain',
      licenseUrl: '',
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: token.colorPrimary }} />
          <span>Credits & Licenses</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={600}
      styles={{
        content: {
          padding: 0,
          overflow: 'hidden',
          borderRadius: token.borderRadiusLG,
        },
        header: {
          padding: `16px max(24px, env(safe-area-inset-right)) 16px max(24px, env(safe-area-inset-left))`,
          margin: 0,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          paddingTop: `calc(16px + env(safe-area-inset-top))`,
        },
        body: {
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          paddingTop: 24,
          paddingLeft: 'max(24px, env(safe-area-inset-left))',
          paddingRight: 'max(24px, env(safe-area-inset-right))',
          maxHeight: '70vh',
          overflowY: 'auto',
        },
      }}
    >
      {/* Project Section */}
      <div
        style={{
          background: `linear-gradient(145deg, ${token.colorBgContainer}, ${token.colorBgElevated})`,
          borderRadius: token.borderRadiusLG,
          padding: 24,
          marginBottom: 24,
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Title level={2} style={{ margin: 0, color: token.colorPrimary, marginBottom: 8 }}>
          Werewolf Game
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          An open-source implementation of the classic social deduction game.
        </Text>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20 }}>
          <Space orientation="vertical" size={2}>
            <Space>
              <UserOutlined /> <Text strong>Author</Text>
            </Space>
            <Text>WeixuanZ</Text>
          </Space>

          <Divider type="vertical" style={{ height: 40 }} />

          <Space orientation="vertical" size={2}>
            <Space>
              <SafetyCertificateOutlined /> <Text strong>License</Text>
            </Space>
            <Text>LGPL v3.0</Text>
          </Space>
        </div>

        <Button
          type="primary"
          icon={<GithubOutlined />}
          href="https://github.com/WeixuanZ/werewolf"
          target="_blank"
          size="large"
          shape="round"
          style={{ paddingInline: 32 }}
        >
          View on GitHub
        </Button>
      </div>

      {/* Assets Section */}
      <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SoundOutlined /> Audio Assets
      </Title>

      <div
        style={{
          background: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          padding: '0 16px',
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <List
          itemLayout="vertical"
          dataSource={credits}
          size="small"
          split={true}
          renderItem={(item) => (
            <List.Item style={{ padding: '12px 0' }}>
              <List.Item.Meta
                title={
                  <Text strong style={{ color: token.colorTextHeading }}>
                    {item.title}
                  </Text>
                }
                description={
                  <Space orientation="vertical" size={0} style={{ width: '100%', fontSize: 13 }}>
                    <Text style={{ color: token.colorText }}>{item.description}</Text>
                    <Space split={<Divider type="vertical" />}>
                      <Space>
                        <Text type="secondary">Source:</Text>
                        {item.sourceUrl ? (
                          <Link href={item.sourceUrl} target="_blank">
                            {item.source}
                          </Link>
                        ) : (
                          <Text type="secondary">{item.source}</Text>
                        )}
                      </Space>
                      <Space>
                        <Text type="secondary">License:</Text>
                        {item.licenseUrl ? (
                          <Link href={item.licenseUrl} target="_blank">
                            {item.license}
                          </Link>
                        ) : (
                          <Text type="secondary">{item.license}</Text>
                        )}
                      </Space>
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </div>
    </Modal>
  );
}
