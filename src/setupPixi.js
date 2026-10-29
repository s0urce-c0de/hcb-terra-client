import { Application, Container, Graphics } from 'pixi.js';

const MARGIN = 0.9;

export default async function setupPixi(dataFetch) {
    const app = new Application();

    const [, data] = await Promise.all([
        app.init({
            background: '#000000',
            resizeTo: window,
            autoDensity: true,
            resolution: window.devicePixelRatio || 1,
            antialias: true,
        }),
        Promise.resolve(dataFetch).then((res) => res.json()),
    ]);

    const { width: worldW, height: worldH, boundsPolygon } = data;

    const world = new Container();
    app.stage.addChild(world);

    const bounds = new Graphics()
        .poly(boundsPolygon.flatMap(({ x, z }) => [x, z]), true)
        .stroke({ width: 0.15, color: 0xffffff });
    world.addChild(bounds);

    function fit() {
        const { width, height } = app.screen;
        world.scale.set(Math.min((width * MARGIN) / worldW, (height * MARGIN) / worldH));
        world.position.set(width / 2, height / 2);
    }

    fit();
    app.renderer.on('resize', fit);

    document.body.appendChild(app.canvas);
    return {app, world};
}