import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Word on the Street Books</h1>
        <p className="text-stone-500">Special Order &amp; Preorder tool</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <Link
          href="/register"
          className="touch-target flex items-center justify-center rounded-lg bg-stone-900 px-5 text-lg font-medium text-white hover:bg-stone-700"
        >
          Register — take a special order
        </Link>
        <Link
          href="/dashboard"
          className="touch-target flex items-center justify-center rounded-lg border border-stone-300 bg-white px-5 text-lg font-medium text-stone-900 hover:bg-stone-100"
        >
          Back office dashboard
        </Link>
      </div>
    </div>
  );
}
