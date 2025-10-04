/**
 * Data models and type definitions for Azure Functions API
 *
 * This module exports all core data models, validators, and utilities
 * for the multiplayer game timer backend.
 */

export type {
  GameState,
  Player,
  GameStateEntity
} from './GameState';

export {
  GameStateValidator
} from './GameState';

export type {
  GameHubClient,
  TurnSwitchedEvent,
  TimerUpdatedEvent,
  GameResetEvent,
  PlayersUpdatedEvent
} from './SignalREvents';
