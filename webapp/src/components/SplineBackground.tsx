import Spline from '@splinetool/react-spline';

/**
 * SplineBackground Component
 * Renders a 3D background using Spline.
 * You can replace the scene URL with your own Spline design.
 * It's set to low opacity and pointer-events-none in App.tsx to serve as a backdrop.
 */
export default function SplineBackground() {
  return (
    <div className="w-full h-full opacity-30">
      {/* 
        This is a placeholder scene. 
        You can replace the URL below with a custom Spline scene url (e.g. etheral shadows).
      */}
      <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />
    </div>
  );
}
