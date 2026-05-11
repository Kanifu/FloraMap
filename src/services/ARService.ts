import { ScanResult } from '@/models';

export class ARService {
  async startScan(): Promise<void> {
    // TODO: Initialize ARCore (Android) or ARKit (iOS) session here.
    // Android: ArSession.create(context), configure ArConfig with HORIZONTAL_PLANE detection
    // iOS: ARWorldTrackingConfiguration with planeDetection = .horizontal
    return Promise.resolve();
  }

  async stopScan(): Promise<ScanResult> {
    // TODO: Pause/close the AR session and extract detected plane anchors and point cloud data.
    // Android: arSession.pause(); collect ArTrackable list
    // iOS: arView.session.pause(); collect currentFrame.anchors
    return Promise.resolve({
      gardenSnapshot: {
        id: 'stub-garden',
        userId: 'stub-user',
        name: 'My Garden',
        polygons: [],
        plants: [],
        lastScannedAt: new Date().toISOString(),
      },
      newPlants: [],
      removedPlantIds: [],
      updatedPlants: [],
    });
  }

  async captureUpdatePhoto(): Promise<string> {
    // TODO: Capture a still frame from the VisionCamera session and save to cache directory.
    // Use VisionCamera's takePhoto() method on the active CameraRef.
    return Promise.resolve('file://stub/photo.jpg');
  }
}

export const arService = new ARService();
