/**
 * Data models and type definitions
 *
 * This module exports all core data models, validators, and utilities
 * for the multiplayer game timer application.
 */

export type {
  GameState,
  Player,
  TimerMode
} from './GameState';

export {
  GameStateValidator,
  TimeFormatter,
  DEFAULT_TIMER_MODE,
  DEFAULT_INITIAL_TIME_SECONDS,
  PLAYER_COUNT_MIN,
  PLAYER_COUNT_MAX,
  DEFAULT_PLAYER_COUNT
} from './GameState';

export type {
  GameHubClient,
  TurnSwitchedEvent,
  TimerUpdatedEvent,
  GameResetEvent,
  PlayersUpdatedEvent
} from './SignalREvents';

export {
  SignalRHubMethods,
  SignalRConnectionState
} from './SignalREvents';
