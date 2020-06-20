// Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as chai from 'chai';
import * as sinon from 'sinon';

import DefaultDeviceChangeEventController from '../../src/devicechangeeventcontroller/DefaultDeviceChangeEventController';
import DeviceChangeEventObserver from '../../src/devicechangeeventobserver/DeviceChangeEventObserver';
import NoOpLogger from '../../src/logger/NoOpLogger';
import TimeoutScheduler from '../../src/scheduler/TimeoutScheduler';
import DOMMockBehavior from '../dommock/DOMMockBehavior';
import DOMMockBuilder from '../dommock/DOMMockBuilder';

describe('DefaultDeviceChangeEventController', () => {
  const expect: Chai.ExpectStatic = chai.expect;
  const logger = new NoOpLogger();

  let deviceChangeEventController: DefaultDeviceChangeEventController;
  let domMockBuilder: DOMMockBuilder;
  let domMockBehavior: DOMMockBehavior;

  function getMediaDeviceInfo(
    deviceId: string,
    kind: MediaDeviceKind,
    label: string
  ): MediaDeviceInfo {
    // @ts-ignore
    return {
      deviceId,
      kind,
      label,
    };
  }

  beforeEach(() => {
    domMockBehavior = new DOMMockBehavior();
    domMockBuilder = new DOMMockBuilder(domMockBehavior);
    deviceChangeEventController = new DefaultDeviceChangeEventController(logger);
  });

  afterEach(() => {
    if (domMockBuilder) {
      domMockBuilder.cleanup();
    }
  });

  describe('Using MediaDevices.ondevicechange', () => {
    it('receives a device change event', async () => {
      let callCount = 0;
      class TestObserver implements DeviceChangeEventObserver {
        didReceiveDeviceChangeEvent(): void {
          callCount += 1;
        }
      }

      deviceChangeEventController.registerObserver(new TestObserver());
      deviceChangeEventController.start();

      await new Promise(resolve =>
        new TimeoutScheduler(domMockBehavior.asyncWaitMs).start(resolve)
      );
      navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
      await navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
      navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
      await new Promise(resolve =>
        new TimeoutScheduler(domMockBehavior.asyncWaitMs).start(resolve)
      );
      expect(callCount).to.equal(3);
    });

    it('stops receiving a device change event', async () => {
      const spy = sinon.spy(navigator.mediaDevices, 'removeEventListener');
      let callCount = 0;
      class TestObserver implements DeviceChangeEventObserver {
        didReceiveDeviceChangeEvent(): void {
          callCount += 1;
        }
      }

      deviceChangeEventController.registerObserver(new TestObserver());
      deviceChangeEventController.start();

      await new Promise(resolve =>
        new TimeoutScheduler(domMockBehavior.asyncWaitMs).start(resolve)
      );
      navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
      deviceChangeEventController.stop();
      expect(spy.called).to.be.true;
      await new Promise(resolve =>
        new TimeoutScheduler(domMockBehavior.asyncWaitMs).start(resolve)
      );
      navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
      navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
      expect(callCount).to.equal(1);
    });
  });

  describe('Not using MediaDevices.ondevicechange', () => {
    beforeEach(() => {
      domMockBehavior.mediaDeviceOnDeviceChangeSupported = false;
      domMockBuilder = new DOMMockBuilder(domMockBehavior);
      deviceChangeEventController = new DefaultDeviceChangeEventController(logger);
    });

    it('does not receive an event if a device list does not change', async () => {
      let callCount = 0;
      class TestObserver implements DeviceChangeEventObserver {
        didReceiveDeviceChangeEvent(): void {
          callCount += 1;
        }
      }

      domMockBehavior.enumerateDeviceList = [
        getMediaDeviceInfo('1', 'audioinput', 'label'),
        getMediaDeviceInfo('2', 'videoinput', 'label'),
        getMediaDeviceInfo('3', 'audiooutput', 'label'),
      ];
      deviceChangeEventController.registerObserver(new TestObserver());
      deviceChangeEventController.start();
      await new Promise(resolve => new TimeoutScheduler(2500).start(resolve));
      deviceChangeEventController.stop();
      expect(callCount).to.equal(0);
    }).timeout(5000);

    it('receives an event if a device list changes', async () => {
      let callCount = 0;
      class TestObserver implements DeviceChangeEventObserver {
        didReceiveDeviceChangeEvent(): void {
          callCount += 1;
        }
      }

      domMockBehavior.enumerateDeviceList = [
        getMediaDeviceInfo('1', 'audioinput', 'label'),
        getMediaDeviceInfo('2', 'videoinput', 'label'),
        getMediaDeviceInfo('3', 'audiooutput', 'label'),
      ];
      deviceChangeEventController.registerObserver(new TestObserver());
      deviceChangeEventController.start();
      await new Promise(resolve => new TimeoutScheduler(1500).start(resolve));

      // Only the ID changes.
      domMockBehavior.enumerateDeviceList = [
        getMediaDeviceInfo('1', 'audioinput', 'label'),
        getMediaDeviceInfo('1', 'videoinput', 'label'),
        getMediaDeviceInfo('3', 'audiooutput', 'label'),
      ];
      await new Promise(resolve => new TimeoutScheduler(1000).start(resolve));

      // The number of devices changes.
      domMockBehavior.enumerateDeviceList = [];

      await new Promise(resolve => new TimeoutScheduler(1000).start(resolve));
      deviceChangeEventController.stop();
      expect(callCount).to.equal(2);
    }).timeout(5000);
  });

  describe('common start and stop behaviors', () => {
    it('cannot start if navigator.mediaDevices does not exist', async () => {
      domMockBehavior.mediaDevicesSupported = false;
      domMockBuilder = new DOMMockBuilder(domMockBehavior);

      deviceChangeEventController = new DefaultDeviceChangeEventController(logger);
      deviceChangeEventController.start();
    });

    it('cannot start more than once', async () => {
      let callCount = 0;
      class TestObserver implements DeviceChangeEventObserver {
        didReceiveDeviceChangeEvent(): void {
          callCount += 1;
        }
      }

      deviceChangeEventController.registerObserver(new TestObserver());
      deviceChangeEventController.start();
      deviceChangeEventController.start();
      deviceChangeEventController.start();

      await new Promise(resolve =>
        new TimeoutScheduler(domMockBehavior.asyncWaitMs).start(resolve)
      );
      navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
      await new Promise(resolve =>
        new TimeoutScheduler(domMockBehavior.asyncWaitMs).start(resolve)
      );
      expect(callCount).to.equal(1);
    });

    it('does not stop if not started', async () => {
      const spy = sinon.spy(navigator.mediaDevices, 'removeEventListener');
      deviceChangeEventController.stop();
      expect(spy.called).to.be.false;
    });

    it('can remove observers', async () => {
      let callCount = 0;
      class TestObserver implements DeviceChangeEventObserver {
        didReceiveDeviceChangeEvent(): void {
          callCount += 1;
        }
      }

      const observer = new TestObserver();
      deviceChangeEventController.registerObserver(observer);
      deviceChangeEventController.start();

      await new Promise(resolve =>
        new TimeoutScheduler(domMockBehavior.asyncWaitMs).start(resolve)
      );
      navigator.mediaDevices.dispatchEvent(new Event('devicechange'));

      // The device change event controller calls observer methods in the next event cycle.
      // Right before calling observer methods, remove observers.
      deviceChangeEventController.removeObserver(observer);
      await new Promise(resolve =>
        new TimeoutScheduler(domMockBehavior.asyncWaitMs).start(resolve)
      );
      expect(callCount).to.equal(0);
    });
  });
});
