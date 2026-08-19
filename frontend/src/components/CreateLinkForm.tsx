import type { FormEvent } from "react";

type CreateLinkFormProps = {
  isSubmitting: boolean;
  formError: string | null;
  notice: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CreateLinkForm({ isSubmitting, formError, notice, onSubmit }: CreateLinkFormProps) {
  return (
    <section className="panel create-panel" aria-labelledby="create-title">
      <div className="panel-header">
        <div>
          <p className="section-kicker">New short link</p>
          <h2 id="create-title">Create link</h2>
        </div>
      </div>
      <form className="create-form" id="create-link-form" onSubmit={onSubmit}>
        <label>
          Destination URL
          <input name="destinationUrl" placeholder="https://example.com/docs" required type="url" />
        </label>
        <label>
          Title
          <input name="title" placeholder="Product docs" />
        </label>
        <label>
          Custom alias
          <input name="customAlias" maxLength={32} minLength={3} pattern="[A-Za-z0-9_-]{3,32}" placeholder="docs101" />
        </label>
        {formError ? (
          <p className="form-message error" role="alert">
            {formError}
          </p>
        ) : null}
        {notice ? <p className="form-message">{notice}</p> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating" : "Create"}
        </button>
      </form>
    </section>
  );
}

