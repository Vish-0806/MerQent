import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { Request, Response } from 'express';

describe('MetricsController (Task 2.12)', () => {
  let controller: MetricsController;
  let metricsService: MetricsService;

  beforeEach(() => {
    metricsService = new MetricsService();
    controller = new MetricsController(metricsService);
  });

  it('should return JSON metrics snapshot by default', () => {
    metricsService.recordHttpRequest('GET', '/api/v1/health', 200, 25);

    const mockReq = {
      query: {},
    } as unknown as Request;

    const jsonMock = jest.fn();
    const setHeaderMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    const mockRes = {
      setHeader: setHeaderMock,
      status: statusMock,
    } as unknown as Response;

    controller.getMetrics(mockReq, mockRes);

    expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledTimes(1);

    const response = jsonMock.mock.calls[0]![0];
    expect(response.requests.total).toBe(1);
    expect(response.requests.byMethod['GET']).toBe(1);
  });

  it('should return Prometheus format when query parameter format=prometheus is specified', () => {
    metricsService.recordHttpRequest('GET', '/api/v1/projects', 200, 40);

    const mockReq = {
      query: { format: 'prometheus' },
    } as unknown as Request;

    const sendMock = jest.fn();
    const setHeaderMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ send: sendMock });

    const mockRes = {
      setHeader: setHeaderMock,
      status: statusMock,
    } as unknown as Response;

    controller.getMetrics(mockReq, mockRes);

    expect(setHeaderMock).toHaveBeenCalledWith(
      'Content-Type',
      'text/plain; version=0.0.4; charset=utf-8',
    );
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(sendMock).toHaveBeenCalledTimes(1);

    const text = sendMock.mock.calls[0]![0];
    expect(typeof text).toBe('string');
    expect(text).toContain('# HELP http_requests_total');
  });

  it('should return Prometheus format when Accept header is text/plain', () => {
    const mockReq = {
      query: {},
    } as unknown as Request;

    const sendMock = jest.fn();
    const setHeaderMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ send: sendMock });

    const mockRes = {
      setHeader: setHeaderMock,
      status: statusMock,
    } as unknown as Response;

    controller.getMetrics(mockReq, mockRes, 'text/plain');

    expect(setHeaderMock).toHaveBeenCalledWith(
      'Content-Type',
      'text/plain; version=0.0.4; charset=utf-8',
    );
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
