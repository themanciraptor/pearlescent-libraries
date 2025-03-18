import { InjectionToken, Provider } from '@angular/core';

/**
 * A tuple type that has no duplicates.
 *
 * Credit: Tobias S.
 * Source: https://stackoverflow.com/questions/74532432/typescript-tuple-with-no-duplicates
 */
type HasDuplicate<TUPLE extends any[]> = TUPLE extends [infer L, ...infer R]
  ? L extends R[number]
    ? true
    : HasDuplicate<R>
  : false;

interface _Config<T extends number[]> {
  inlineThresholds?: HasDuplicate<T> extends false ? [...T] : never;
  blockThresholds?: HasDuplicate<T> extends false ? [...T] : never;
  boxModel?: 'border-box' | 'content-box';
}

export type Config = _Config<number[]>;

/**
 * A token that can be used to provide a configuration to the `ResizeDirective`.
 *
 * Note: It is recommended to use the `provideDefaultResizeConfig` function to provide a default configuration to the application.
 */
export const RESIZE_CONFIG = new InjectionToken<Config>('resizeConfig');

export function provideDefaultResizeConfig(config: Config): Provider {
  return {
    provide: RESIZE_CONFIG,
    useValue: {
      inlineThresholds: [...new Set(config.inlineThresholds ?? [])].sort(
        (a, b) => a - b
      ),
      blockThresholds: [...new Set(config.blockThresholds ?? [])].sort(
        (a, b) => a - b
      ),
    },
  };
}
