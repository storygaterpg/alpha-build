import MainScene from '../../phaser/scenes/MainScene';

describe('MainScene.findPath', () => {
  let scene: MainScene;

  beforeEach(() => {
    scene = new MainScene();
  });

  it('should return horizontal path', () => {
    const path = scene.findPath({ x: 0, y: 0 }, { x: 3, y: 0 });
    expect(path).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 }
    ]);
  });

  it('should return vertical path', () => {
    const path = scene.findPath({ x: 0, y: 0 }, { x: 0, y: 2 });
    expect(path).toEqual([
      { x: 0, y: 1 },
      { x: 0, y: 2 }
    ]);
  });

  it('should return diagonal path', () => {
    const path = scene.findPath({ x: 0, y: 0 }, { x: 2, y: 2 });
    expect(path).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 }
    ]);
  });

  it('should return reverse diagonal path', () => {
    const path = scene.findPath({ x: 2, y: 2 }, { x: 0, y: 0 });
    expect(path).toEqual([
      { x: 1, y: 1 },
      { x: 0, y: 0 }
    ]);
  });
});

describe('MainScene.clearHighlights', () => {
  let scene: MainScene;
  const fakeRect1 = { destroy: jest.fn() };
  const fakeRect2 = { destroy: jest.fn() };

  beforeEach(() => {
    scene = new MainScene();
    // @ts-ignore: private property
    scene.highlightRects = [fakeRect1, fakeRect2];
  });

  it('should destroy all highlight rectangles and clear the array', () => {
    // call private method via any
    (scene as any).clearHighlights();
    expect(fakeRect1.destroy).toHaveBeenCalled();
    expect(fakeRect2.destroy).toHaveBeenCalled();
    // @ts-ignore: private property
    expect(scene.highlightRects).toHaveLength(0);
  });
});

describe('MainScene.setMovementEnabled', () => {
  let scene: MainScene;

  beforeEach(() => {
    scene = new MainScene();
    // spy on private clearHighlights
    (scene as any).clearHighlights = jest.fn();
  });

  it('should not call clearHighlights when enabling movement', () => {
    scene.setMovementEnabled(true);
    expect((scene as any).movementEnabled).toBe(true);
    // clearHighlights should not be called when enabling
    expect(((scene as any).clearHighlights as jest.Mock)).not.toHaveBeenCalled();
  });

  it('should call clearHighlights and reset lastTilePos when disabling movement', () => {
    // Start with movement enabled
    scene.setMovementEnabled(true);
    // @ts-ignore: set lastTilePos to a value
    scene.lastTilePos = { x: 5, y: 5 };

    scene.setMovementEnabled(false);

    expect((scene as any).movementEnabled).toBe(false);
    expect(((scene as any).clearHighlights as jest.Mock)).toHaveBeenCalled();
    // @ts-ignore: private property
    expect(scene.lastTilePos).toBeUndefined();
  });
});

describe('MainScene.showPath', () => {
  let scene: MainScene;
  const setOriginMock = jest.fn();
  const setDepthMock = jest.fn();

  beforeEach(() => {
    scene = new MainScene();
    // Mock private clearHighlights
    (scene as any).clearHighlights = jest.fn();
    // @ts-ignore: private property
    scene.highlightRects = [];
    // @ts-ignore: mock Phaser add.rectangle
    scene.add = {
      rectangle: jest.fn().mockImplementation(() => ({
        setOrigin: setOriginMock,
        setDepth: setDepthMock,
        destroy: jest.fn()
      }))
    };
  });

  it('should clear existing highlights and add new rectangle for each path point', () => {
    const path = [
      { x: 1, y: 2 },
      { x: 3, y: 4 }
    ];

    // @ts-ignore: call public method
    scene.showPath(path);

    // clearHighlights should be called
    expect(((scene as any).clearHighlights as jest.Mock)).toHaveBeenCalled();

    // rectangle should be called for each path element
    expect((scene.add.rectangle as jest.Mock)).toHaveBeenCalledTimes(path.length);

    // highlightRects length should match
    // @ts-ignore
    expect(scene.highlightRects).toHaveLength(path.length);

    // check rectangle setup calls
    expect(setOriginMock).toHaveBeenCalledTimes(path.length);
    expect(setDepthMock).toHaveBeenCalledTimes(path.length);
  });
}); 