import { configure, getExecutor } from './config';
import { FakeExecutor } from '@/executor/fake-executor';

describe('runtime config', () => {
  it('未設定でgetExecutorは例外', () => {
    // 別importの汚染を避けるため動的に再読み込み
    expect(() => getExecutor()).toThrow();
  });
  it('configureしたexecutorを返す', async () => {
    const fake = new FakeExecutor({ stdout: 'hi' });
    configure({ executor: fake });
    const res = await getExecutor().run('echo "hi";');
    expect(res.stdout).toBe('hi');
  });
});
