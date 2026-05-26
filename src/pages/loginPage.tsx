import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { postLogin } from '../apis/auth';
import loginCard from '../images/icon/loginCard.svg';
import { saveStoredUserId } from '../utils/authStorage';

type LoginValidationErrors = {
  email?: string;
  password?: string;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] =
    useState<LoginValidationErrors>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    const nextValidationErrors: LoginValidationErrors = {};

    if (!email.trim()) {
      nextValidationErrors.email = '아이디를 입력하세요';
    }

    if (!password.trim()) {
      nextValidationErrors.password = '비밀번호를 입력하세요';
    }

    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors);
      return;
    }

    setValidationErrors({});
    setIsSubmitting(true);

    try {
      const response = await postLogin({ email, password });
      localStorage.setItem('userEmail', response.email);
      saveStoredUserId(response.user_id);
      navigate('/projects');
    } catch (error) {
      console.error('로그인 실패:', error);
      setErrorMessage('ID 또는 비밀번호를 확인해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="reaction-bg reaction-login-page relative min-h-screen overflow-hidden text-[#eee7dc]">
      <div className="reaction-login-glow absolute left-1/2 top-[-24px] z-0 -translate-x-1/2" />
      <div className="reaction-home-vignette absolute inset-0 z-0" />

      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1040px] items-center gap-12 px-8 py-12 md:grid-cols-[1fr_370px] md:px-14">
        <div className="select-none justify-self-center md:justify-self-start">
          <h1 className="reaction-logo-font text-[clamp(5.2rem,13vw,9.6rem)] leading-[0.78] text-[#f5eee4] drop-shadow-[0_18px_42px_rgba(0,0,0,0.46)]">
            Re:
            <span className="mt-5 block text-[0.56em]">Action</span>
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="reaction-login-card relative mx-auto h-[303px] w-full max-w-[362px] px-[34px] pb-12 pt-[50px] text-[#2d1715]"
        >
          <img
            src={loginCard}
            alt=""
            className="pointer-events-none absolute inset-0 z-0 h-full w-full"
            aria-hidden="true"
          />

          <h2 className="reaction-logo-font relative z-10 mb-8 text-center text-[31px] leading-none text-[#1d1513]">
            LOGIN
          </h2>

          <div className="relative z-10 space-y-[10px]">
            <label className="sr-only" htmlFor="login-id">
              ID
            </label>
            <input
              id="login-id"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setValidationErrors((current) => ({
                  ...current,
                  email: undefined,
                }));
              }}
              className={`reaction-login-input h-[35px] w-full rounded-full border bg-transparent px-5 text-center text-[11px] font-semibold text-[#2d1715] outline-none transition ${
                validationErrors.email
                  ? 'reaction-login-input-error !border-[#9f1f2d]'
                  : 'border-white/85'
              }`}
              placeholder={
                validationErrors.email ?? '아이디를 입력해주세요'
              }
              autoComplete="username"
              aria-invalid={Boolean(validationErrors.email)}
            />

            <div className="relative">
              <label className="sr-only" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setValidationErrors((current) => ({
                    ...current,
                    password: undefined,
                  }));
                }}
                className={`reaction-login-input h-[35px] w-full rounded-full border bg-transparent px-10 text-center text-[11px] font-semibold text-[#2d1715] outline-none transition ${
                  validationErrors.password
                    ? 'reaction-login-input-error !border-[#9f1f2d]'
                    : 'border-white/100'
                }`}
                placeholder={
                  validationErrors.password ?? '비밀번호를 입력해주세요'
                }
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={Boolean(validationErrors.password)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-[#2d1715] transition hover:text-[#6f1c25] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6f1c25]/30"
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="reaction-ui-font h-[35px] w-full rounded-full border border-white/85 bg-[#6f5752] text-[11px] font-semibold text-[#f6eee4] transition hover:border-white hover:bg-[#5d4642] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6f1c25]/35 disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isSubmitting ? '로그인 중' : '로그인'}
            </button>
          </div>

          <p className="reaction-ui-font relative z-10 mt-2 min-h-[14px] text-center text-[10px] font-semibold text-[#7a1d24]">
            {isSubmitting ? '로그인 중입니다.' : errorMessage}
          </p>

          <div className="reaction-ui-font relative z-10 mt-[6px] flex items-center justify-center gap-3 text-[10px] font-medium text-[#2d1715]/70">
            <button
              type="button"
              className="transition hover:text-[#6f1c25] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6f1c25]/30"
            >
              아이디 찾기
            </button>
            <span className="h-[9px] w-px bg-[#2d1715]/35" />
            <button
              type="button"
              className="transition hover:text-[#6f1c25] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6f1c25]/30"
            >
              비밀번호 찾기
            </button>
            <span className="h-[9px] w-px bg-[#2d1715]/35" />
            <button
              type="button"
              className="transition hover:text-[#6f1c25] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6f1c25]/30"
            >
              회원가입
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
