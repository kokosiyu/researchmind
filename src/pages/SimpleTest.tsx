export default function SimpleTest() {
  console.log('SimpleTest is rendering');
  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Hello World!</h1>
        <p className="text-xl text-slate-700">ResearchMind 正在运行中！</p>
      </div>
    </div>
  );
}
