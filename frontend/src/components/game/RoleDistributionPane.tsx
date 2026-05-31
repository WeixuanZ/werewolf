import { Flex, Typography, theme } from 'antd';
import { getRoleEmoji } from '../../utils/roleUtils';
import { RoleType } from '../../types';

const { Text } = Typography;

interface RoleDistributionPaneProps {
  roleDistribution: Record<string, number>;
}

export function RoleDistributionPane({ roleDistribution }: RoleDistributionPaneProps) {
  const { token } = theme.useToken();

  const activeRoles = Object.entries(roleDistribution)
    .filter(([role, count]) => count > 0 && role !== RoleType.SPECTATOR)
    .sort((a, b) => b[1] - a[1]);

  if (activeRoles.length === 0) return null;

  return (
    <Flex wrap="wrap" gap={4} justify="flex-end" align="center">
      {activeRoles.map(([role, count]) => (
        <Flex
          key={role}
          align="center"
          gap={4}
          title={role}
          style={{
            padding: '2px 8px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: token.borderRadiusSM,
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>{getRoleEmoji(role)}</span>
          <Text strong style={{ fontSize: 12, color: token.colorTextSecondary, lineHeight: 1 }}>
            {count}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}
