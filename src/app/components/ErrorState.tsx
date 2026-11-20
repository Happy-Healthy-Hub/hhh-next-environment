export function ErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="hhh-inline-alert">
      {message}
    </div>
  );
}
