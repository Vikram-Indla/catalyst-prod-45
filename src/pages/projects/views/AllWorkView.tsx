import React from 'react';
import { ProjectData } from '../../../types/project.types';
import ListView from './ListView';

interface AllWorkViewProps {
  project: ProjectData;
}

export default function AllWorkView({ project }: AllWorkViewProps) {
  // All work view reuses ListView with all items shown
  return <ListView project={project} />;
}
