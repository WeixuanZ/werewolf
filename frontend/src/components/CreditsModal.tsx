import { Modal, Typography, List, Divider } from 'antd';

const { Text, Link, Title } = Typography;

interface CreditsModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreditsModal({ open, onClose }: CreditsModalProps) {
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
  ];

  return (
    <Modal
      title="Credits"
      open={open}
      onCancel={onClose}
      footer={null}
      centered
    >
      <Title level={5}>Sound Effects</Title>
      <List
        itemLayout="vertical"
        dataSource={credits}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              title={item.title}
              description={
                <>
                  <Text>{item.description}</Text>
                  <br />
                  <Text type="secondary">Source: </Text>
                  <Link href={item.sourceUrl} target="_blank">
                    {item.source}
                  </Link>
                  <Divider type="vertical" />
                  <Link href={item.licenseUrl} target="_blank">
                    {item.license}
                  </Link>
                </>
              }
            />
          </List.Item>
        )}
      />
    </Modal>
  );
}
