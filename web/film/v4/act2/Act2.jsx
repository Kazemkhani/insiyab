// Act2.jsx — 42-80s: assembles all Act 2 scenes
import React from 'react';
import { SCENE, s } from '../beat.js';
import { Question } from './scenes/Question.jsx';
import { MapPrecise } from './scenes/MapPrecise.jsx';
import { CallChain } from './scenes/CallChain.jsx';
import { Chart } from './scenes/Chart.jsx';
import { Resolution } from './scenes/Resolution.jsx';

export function Act2({ frame }) {
  const { ACT2_START, QUESTION, MAP_PRECISE, CALL_CHAIN, CHART, RESOLUTION } = SCENE;

  if (frame < MAP_PRECISE) {
    return <Question frame={frame} localFrame={frame - QUESTION} />;
  }
  if (frame < CALL_CHAIN) {
    return <MapPrecise frame={frame} localFrame={frame - MAP_PRECISE} />;
  }
  if (frame < CHART) {
    return <CallChain frame={frame} localFrame={frame - CALL_CHAIN} />;
  }
  if (frame < RESOLUTION) {
    return <Chart frame={frame} localFrame={frame - CHART} />;
  }
  return <Resolution frame={frame} localFrame={frame - RESOLUTION} />;
}
