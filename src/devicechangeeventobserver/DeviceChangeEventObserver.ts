// Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * [[DeviceChangeEventObserver]] can be registered with a [[DeviceChangeEventController]]
 * to receive callbacks when the "devicechange" event occurs.
 */
export default interface DeviceChangeEventObserver {
  /**
   * Called when the "devicechange" event occurs.
   */
  didReceiveDeviceChangeEvent?(): void;
}
