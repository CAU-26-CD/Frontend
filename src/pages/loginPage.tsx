import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { postLogin } from '../apis/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await postLogin({ email, password });

      if (response.accessToken) {
        localStorage.setItem('accessToken', response.accessToken);
      }

      navigate('/projects');
    } catch (error) {
      console.error('로그인 실패:', error);
      setErrorMessage('ID 또는 비밀번호를 확인해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="reaction-bg relative min-h-screen overflow-hidden text-[#eee7dc]">
      <div className="reaction-top-light absolute left-1/2 top-[-48px] z-0 -translate-x-1/2" />

      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-12 px-8 py-12 md:grid-cols-[1fr_420px] md:px-14">
        <div className="select-none">
          <h1 className="font-serif text-[clamp(4.4rem,12vw,9.5rem)] leading-[0.82] tracking-normal text-[#f2eadf] drop-shadow-[0_14px_35px_rgba(0,0,0,0.45)]">
            Re:
            <span className="mt-5 block text-[0.56em]">Action</span>
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="reaction-panel-ticket reaction-panel-shadow relative mx-auto w-full max-w-[350px] px-5 pb-7 pt-4 text-[#2d1715]"
        >
          <h2 className="mb-4 text-center font-serif text-xl font-semibold">
            LOGIN
          </h2>

          <div className="grid grid-cols-[1fr_70px] gap-3">
            <div className="space-y-2">
              <label className="sr-only" htmlFor="login-id">
                ID
              </label>
              <input
                id="login-id"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="reaction-input h-10 w-full rounded-md border px-4 text-center font-serif text-sm outline-none transition"
                placeholder="ID"
                autoComplete="username"
                required
              />

              <label className="sr-only" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="reaction-input h-10 w-full rounded-md border px-4 text-center font-serif text-sm outline-none transition"
                placeholder="PASSWORD"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="reaction-input h-full min-h-22 rounded-md border font-serif text-xs font-semibold transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6f1c25]/30 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Login"
            >
              {isSubmitting ? '...' : ''}
            </button>
          </div>

          {errorMessage && (
            <p className="mt-3 text-center text-xs font-medium text-[#7a1d24]">
              {errorMessage}
            </p>
          )}

          <button
            type="button"
            className="mt-7 h-10 w-full font-serif text-base font-semibold text-[#17100f] transition hover:text-[#6f1c25] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6f1c25]/30"
          >
            SIGN UP
          </button>
        </form>
      </section>
    </main>
  );
}
