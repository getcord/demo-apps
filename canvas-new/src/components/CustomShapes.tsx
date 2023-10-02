import useImage from 'use-image';
import { Image } from 'react-konva';
import type Konva from 'konva';

type CustomShapeProps = Omit<Konva.ImageConfig, 'image'>;

export function CustomArrow(props: CustomShapeProps) {
  const [image] = useImage('/images/canvas-arrow.png');
  return <Image {...props} image={image} />;
}

export function CustomSquiggle(props: CustomShapeProps) {
  const [image] = useImage('/images/canvas-squiggle.png');
  return <Image {...props} image={image} />;
}

export function CustomSparkle(props: CustomShapeProps) {
  const [image] = useImage('/images/canvas-sparkle.png');
  return <Image {...props} image={image} />;
}
