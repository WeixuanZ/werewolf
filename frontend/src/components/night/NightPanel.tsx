import { theme, Typography } from 'antd';
import { useSubmitAction } from '../../api/client';
import { NightActionType, RoleType } from '../../types';
import type { Player } from '../../types';
import { WerewolfPanel } from './WerewolfPanel';
import { PhaseTimer } from '../game/PhaseTimer';
import { CupidAction } from './CupidAction';
import { WitchAction } from './WitchAction';
import { GenericAction } from './GenericAction';

const { Text } = Typography;

interface NightPanelProps {
  myRole: string;
  players: Player[];
  playerId: string;
  roomId: string;
  hasSubmittedAction?: boolean;
  phaseStartTime?: number | null;
  phaseDurationSeconds?: number;
  timerEnabled?: boolean;
}

export function NightPanel({
  myRole,
  players,
  playerId,
  roomId,

  phaseStartTime,
  phaseDurationSeconds = 60,
  timerEnabled = true,
}: NightPanelProps) {
  const { token } = theme.useToken();
  const submitAction = useSubmitAction(roomId);

  // Special handling for Werewolf role (live voting) - complex enough to keep separate
  if (myRole === RoleType.WEREWOLF) {
    return (
      <WerewolfPanel
        players={players}
        playerId={playerId}
        roomId={roomId}
        phaseStartTime={phaseStartTime}
        phaseDurationSeconds={phaseDurationSeconds}
        timerEnabled={timerEnabled}
      />
    );
  }

  const me = players.find((p) => p.id === playerId);
  const nightInfo = me?.night_info;
  const confirmedActionType = me?.night_action_type;
  const confirmedTargetId = me?.night_action_target;

  const handleActionSubmit = (
    actionType: string,
    tid: string | null | string[],
    confirmed: boolean = true,
  ) => {
    let finalTarget: string | null = null;

    if (actionType === NightActionType.SKIP) {
      finalTarget = 'SKIP';
    } else if (actionType === NightActionType.HEAL) {
      finalTarget = (typeof tid === 'string' ? tid : null) || nightInfo?.victim_id || null;
    } else if (actionType === NightActionType.LINK) {
      if (Array.isArray(tid)) {
        finalTarget = tid.join(',');
      } else {
        return;
      }
    } else {
      finalTarget = typeof tid === 'string' ? tid : null;
    }

    if (!finalTarget && actionType !== NightActionType.SKIP) return;

    submitAction.mutate({
      playerId,
      actionType,
      targetId: finalTarget || 'SKIP',
      confirmed: confirmed,
    });
  };

  // Passive Roles
  if (!myRole || ['VILLAGER', 'SPECTATOR', 'LYCAN', 'TANNER'].includes(myRole)) {
    return (
      <div
        style={{
          background: 'rgba(20, 20, 30, 0.6)',
          backdropFilter: 'blur(12px)',
          borderRadius: token.borderRadiusLG,
          padding: token.paddingLG,
          border: `1px solid rgba(255, 255, 255, 0.1)`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          textAlign: 'center',
          maxWidth: 600,
          margin: '0 auto',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <PhaseTimer
            key={phaseStartTime}
            phaseStartTime={phaseStartTime}
            phaseDurationSeconds={phaseDurationSeconds}
            timerEnabled={timerEnabled}
          />
        </div>
        <Text style={{ fontSize: 18, color: token.colorTextSecondary }}>
          {myRole === 'LYCAN' || myRole === 'TANNER'
            ? 'You are sleeping... (Passive Role) 💤'
            : 'You are sleeping... 💤'}
        </Text>
      </div>
    );
  }

  const alivePlayers = players.filter((p) => p.is_alive && !p.is_spectator);

  if (myRole === 'CUPID') {
    return (
      <CupidAction
        myRole={myRole}
        alivePlayers={alivePlayers}
        nightInfo={nightInfo}
        phaseStartTime={phaseStartTime}
        phaseDurationSeconds={phaseDurationSeconds}
        timerEnabled={timerEnabled}
        onSubmit={handleActionSubmit}
        isPending={submitAction.isPending}
        confirmedTargetId={confirmedTargetId}
      />
    );
  }

  if (myRole === 'WITCH' && me) {
    return (
      <WitchAction
        myRole={myRole}
        alivePlayers={alivePlayers}
        me={me}
        nightInfo={nightInfo}
        phaseStartTime={phaseStartTime}
        phaseDurationSeconds={phaseDurationSeconds}
        timerEnabled={timerEnabled}
        onSubmit={handleActionSubmit}
        isPending={submitAction.isPending}
        confirmedActionType={confirmedActionType}
        confirmedTargetId={confirmedTargetId}
      />
    );
  }

  // Fallback for active roles (Seer, Doctor, Hunter, Bodyguard)
  return (
    <GenericAction
      myRole={myRole}
      alivePlayers={alivePlayers}
      nightInfo={nightInfo}
      phaseStartTime={phaseStartTime}
      phaseDurationSeconds={phaseDurationSeconds}
      timerEnabled={timerEnabled}
      onSubmit={handleActionSubmit}
      isPending={submitAction.isPending}
      confirmedTargetId={confirmedTargetId}
    />
  );
}
