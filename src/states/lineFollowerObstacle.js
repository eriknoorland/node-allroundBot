const config = require('../config');
const constrain = require('../utils/constrain');

/**
 * lineFollowerObstacle
 * @param {Object} options
 * @return {Object}
 */
module.exports = ({ logger, controllers, sensors }) => {
  const { speed, pid } = config;
  const { main } = controllers;
  const { camera, lidar } = sensors;
  const startDelay = 1500;

  let direction = 0; // negative = left, positive = right
  let isRunning = false;
  let heartbeat;
  let centerX;

  /**
   * Constructor
   */
  function constructor() {
    logger.log('constructor', 'lineFollowerObstacle');
  }

  /**
   * Start
   */
  function start() {
    lidar.on('data', onLidarData);
    camera.on('line', onLineData);
    camera.on('stateChange', onStateChangeData);
    camera.setState('line', { tilt: 170 })
      .then(onLineStateSet);
  }

  /**
   * Line state set event handler
   */
  function onLineStateSet() {
    setTimeout(() => { isRunning = true; }, startDelay);
  }

  /**
   * Stop
   */
  function stop() {
    isRunning = false;

    // lidar.off('data', onLidarData); // FIXME or when object was detected
    camera.off('line', onLineData);
    camera.off('stateChange', onStateChangeData);
    camera.setState('idle');
    main.stop();

    setTimeout(main.stop.bind(null, 1), 1000);
  }

  /**
   * Mission complete
   */
  function missionComplete() {
    logger.log('mission complete', 'lineFollowerObstacle');
    stop();
  }

  /**
   * Lidar data event handler
   * @param {Object} data
   */
  function onLidarData({ angle, distance }) {
    const radius = 300;
    const openingAngle = 90;
    const halfAngle = openingAngle * 0.5;

    if (distance && (angle >= 360 - halfAngle || angle <= halfAngle) && distance <= radius) {
      lidar.off('data', onLidarData);

      logger.log(`obstacle detected at ${angle} at a distance of ${distance / 10}cm`);
      logger.log(`turn around ${direction < 0 ? 'left' : 'right'} side of can`);
    }
  }

  /**
   * Camera line data event handler
   * @param {Object} data
   */
  function onLineData({ x0, x1 }) {
    const { Kp } = pid.lineFollowing;
    const error0 = (x0 - centerX);
    const error1 = (x1 - centerX);
    const error = error0 + error1;
    const leftSpeed = constrain(Math.round(speed.lineFollowing - (error * Kp)), 0, 20);
    const rightSpeed = constrain(Math.round(speed.lineFollowing + (error * Kp)), 0, 20);

    if (isRunning) {
      main.drive(leftSpeed, rightSpeed);
      direction = leftSpeed - rightSpeed;
    }

    if (heartbeat) {
      clearTimeout(heartbeat);
    }

    heartbeat = setTimeout(missionComplete, 500);
  }

  /**
   * Camera state change data event handler
   * @param {Object} data
   */
  function onStateChangeData({ frameWidth }) {
    centerX = frameWidth * 0.5;
  }

  constructor();

  return {
    start,
    stop,
  };
};
