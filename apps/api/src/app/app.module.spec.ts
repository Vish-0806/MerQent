import { AppModule } from './app.module';

describe('AppModule Architecture Sanity', () => {
  it('should be defined as a valid NestJS root module', () => {
    expect(AppModule).toBeDefined();
  });
});
