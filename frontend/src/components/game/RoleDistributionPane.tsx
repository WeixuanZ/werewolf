import React from 'react';
import { Flex, Typography, theme } from 'antd';
import { getRoleEmoji } from '../../utils/roleUtils';
import { RoleType } from '../../types';

const { Text } = Typography;

interface RoleDistributionPaneProps {
  roleDistribution: Record<string, number>;
}

export const RoleDistributionPane: React.FC<RoleDistributionPaneProps> = ({ roleDistribution }) => {
  const { token } = theme.useToken();

  const activeRoles = Object.entries(roleDistribution)
    .filter(([role, count]) => count > 0 && role !== RoleType.SPECTATOR)
    .sort((a, b) => b[1] - a[1]); // Sort by count descending

  if (activeRoles.length === 0) return null;

  return (
    <Flex
      wrap="wrap"
      gap={6}
      justify="center"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        padding: '6px 10px',
        borderRadius: token.borderRadius,
        border: '1px solid rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(4px)',
        width: 'fit-content',
        margin: '0 auto ' + token.margin + 'px auto',
      }}
    >
      {activeRoles.map(([role, count]) => (
        <Flex
          key={role}
          align="center"
          gap={4}
          style={{
            padding: '2px 6px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: token.borderRadiusSM,
            border: '1px solid rgba(255, 255, 255, 0.04)',
          }}
        >
          <span style={{ fontSize: 14 }} title={role}>
            {getRoleEmoji(role)}
          </span>
          <Text strong style={{ fontSize: 12, color: token.colorTextSecondary }}>
            {count}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
};
