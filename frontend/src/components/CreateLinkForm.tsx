import type { FormEvent } from "react";

type CreateLinkFormProps = {
  isSubmitting: boolean;
  formError: string | null;
  notice: string | null;
  shortUrl: string | null;
  copyLabel: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCopy: () => void;
};

export function CreateLinkForm({ isSubmitting, formError, notice, shortUrl, copyLabel, onSubmit, onCopy }: CreateLinkFormProps) {
  return (
    <section id="create-title" className="panel create-panel" aria-labelledby="create-heading">
      <div className="panel-header">
        <div>
          <p className="section-kicker">New short link</p>
          <h2 id="create-heading">Create link</h2>
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
        {shortUrl ? (
          <div className="short-url-result" aria-live="polite">
            <span className="short-url-label">Short link ready</span>
            <div className="copy-row">
              <input
                aria-label="Shortened link"
                readOnly
                value={shortUrl}
                onClick={(event) => event.currentTarget.select()}
              />
              <button type="button" onClick={onCopy}>
                {copyLabel}
              </button>
            </div>
          </div>
        ) : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating" : "Create"}
        </button>
      </form>
    </section>
  );
}

