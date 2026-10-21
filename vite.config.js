import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import handler from './api/crime.js';

// 로컬 개발(npm run dev)에서도 배포와 똑같이 /api/crime 이 동작하게 하는 작은 플러그인.
// - loadEnv(mode, cwd, '') 로 .env.local 의 DATA_GO_KR_KEY 를 "서버(Node)" 쪽에서만 읽습니다.
// - 이름에 VITE_ 접두사를 붙이지 않았기 때문에 Vite가 브라우저 번들에 넣지 않습니다.
//   (VITE_ 로 시작하는 변수는 브라우저 코드에 그대로 박히므로 키에 절대 쓰면 안 됨)
function localApi() {
  return {
    name: 'local-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const name of ['DATA_GO_KR_KEY', 'DATA_GO_KR_TIME_KEY']) {
        if (env[name]) process.env[name] = env[name];
      }
      server.middlewares.use('/api/crime', (req, res) => {
        // connect 미들웨어가 경로 앞부분을 잘라내므로 원래 URL로 복원
        req.url = req.originalUrl;
        handler(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApi()],
});
