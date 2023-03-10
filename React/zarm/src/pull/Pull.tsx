import React, { PureComponent, CSSProperties, ReactNode } from 'react';
import classnames from 'classnames';
import {
  SuccessCircle as SuccessCircleIcon,
  WarningCircle as WarningCircleIcon,
} from '@zarm-design/icons';
import { REFRESH_STATE, LOAD_STATE, PullAction, PropsType } from './PropsType';
import Events from '../utils/events';
import Throttle from '../utils/throttle';
import { getScrollTop } from '../utils/dom';
import Drag from '../drag';
import ActivityIndicator from '../activity-indicator';

export interface PullProps extends PropsType {
  prefixCls?: string;
  className?: string;
}

export default class Pull extends PureComponent<PullProps, any> {
  private pull;

  private wrap;

  private throttledScroll;

  private wrapTouchstartY;

  private mounted = true;

  static defaultProps: PullProps = {
    prefixCls: 'za-pull',
    refresh: {
      state: REFRESH_STATE.normal,
      startDistance: 30,
      distance: 30,
    },
    load: {
      state: LOAD_STATE.normal,
      distance: 0,
    },
    animationDuration: 400,
    stayTime: 1000,
  };

  constructor(props) {
    super(props);
    this.state = {
      offsetY: 0,
      animationDuration: 0,
      refreshState: props.refresh.state,
      loadState: props.load.state,
    };
    this.throttledScroll = Throttle(this.onScroll, 250);
  }

  componentDidMount() {
    this.mounted = true;
    this.addEvent();
  }

  static getDerivedStateFromProps(nextProps, state) {
    const { load, refresh } = nextProps;
    const { prevLoad = {}, prevRefresh = {} } = state;
    if ('load' in nextProps && load.state !== prevLoad.state) {
      return {
        loadState: load.state,
        prevLoad: load,
      };
    }

    if ('refresh' in nextProps && refresh.state !== prevRefresh.state) {
      return {
        refreshState: refresh.state,
        prevRefresh: refresh,
      };
    }
    return null;
  }

  componentDidUpdate(prevProps) {
    this.addEvent();

    const { load, refresh } = this.props;
    if (prevProps.load!.state !== load!.state) {
      this.doLoadAction(load!.state as LOAD_STATE);
    }
    if (prevProps.refresh!.state !== refresh!.state) {
      this.doRefreshAction(refresh!.state as REFRESH_STATE);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    this.removeEvent();
  }

  get scrollContainer(): HTMLElement | Window {
    const container =
      ((node) => {
        while (node && node.parentNode && node.parentNode !== document.body) {
          const style = window.getComputedStyle(node);
          if (
            // overflow ?????? overflowY ?????? scroll/auto
            (['scroll', 'auto'].indexOf(style.overflowY!) > -1 ||
              ['scroll', 'auto'].indexOf(style.overflow!) > -1) &&
            // height ?????? max-height ????????? 0
            (parseInt(style.height!, 10) > 0 || parseInt(style.maxHeight!, 10) > 0)
          ) {
            return node;
          }
          node = node.parentNode;
        }
      })(this.pull) || window;

    return container;
  }

  get scrollTop(): number {
    return getScrollTop(this.wrap);
  }

  // ?????????????????????
  getScrollContainer = (): HTMLElement | Window => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Warning: getScrollContainer() has been renamed, and is not recommended for use.

* Rename \`getScrollContainer()\` to \`scrollContainer\` to suppress this warning.`);
    }
    return this.scrollContainer;
  };

  wrapTouchstart = (event): void => {
    const touch = event.touches[0];
    this.wrapTouchstartY = touch.pageY;
  };

  wrapTouchmove = (event): void => {
    const touch = event.touches[0];
    const currentY = touch.pageY;
    if (currentY - this.wrapTouchstartY > 0 && event.cancelable && this.scrollTop === 0) {
      event.preventDefault();
    }
  };

  wrapTouchEnd = (): void => {
    this.wrapTouchstartY = 0;
    this.setState({ animationDuration: this.props.animationDuration });
  };

  addEvent = (): void => {
    // scrollContainer ?????????
    if (this.wrap === this.scrollContainer) return;

    // ??????????????????
    if (this.wrap) {
      this.removeEvent();
    }

    // ???????????? scrollContainer
    this.wrap = this.scrollContainer;

    // ????????????
    Events.on(this.wrap, 'scroll', this.throttledScroll);
    Events.on(this.wrap, 'touchstart', this.wrapTouchstart);
    Events.on(this.wrap, 'touchmove', this.wrapTouchmove);
    Events.on(this.wrap, 'touchend', this.wrapTouchEnd);
  };

  removeEvent = (): void => {
    Events.off(this.wrap, 'scroll', this.throttledScroll);
    Events.off(this.wrap, 'touchstart', this.wrapTouchstart);
    Events.off(this.wrap, 'touchmove', this.wrapTouchmove);
    Events.off(this.wrap, 'touchend', this.wrapTouchEnd);
  };

  onScroll = (): void => {
    const { refreshState, loadState } = this.state;
    // window????????????????????????????????? window ???????????? scrollHeight ??? clientHeight???
    const {
      scrollHeight = document.body.clientHeight,
      clientHeight = document.documentElement.clientHeight
    } = this.wrap;
    const load: PullAction = { ...Pull.defaultProps.load, ...this.props.load };
    const { handler, distance } = load;

    if (
      typeof handler !== 'function' ||
      refreshState !== REFRESH_STATE.normal ||
      loadState !== LOAD_STATE.normal ||
      scrollHeight <= clientHeight ||
      // ???????????? - ????????? - ???????????? <= ??????????????????
      scrollHeight - this.scrollTop - distance! > clientHeight
    ) {
      return;
    }
    handler();
  };

  onDragMove = (event, { offsetY }): boolean => {
    const { handler } = this.props.refresh!;
    if (
      // ?????????????????????
      !handler ||
      // ??????
      offsetY <= 0 ||
      // ??????????????????
      (offsetY > 0 && this.scrollTop > 0) ||
      // ???????????????????????????
      this.state.refreshState >= REFRESH_STATE.loading
    ) {
      return false;
    }

    // ???????????????????????????????????????touchmove?????????bug
    if (!Events.supportsPassiveEvents) {
      event.preventDefault();
    }

    const refresh: PullAction = { ...Pull.defaultProps.refresh, ...this.props.refresh };
    const { startDistance, distance } = refresh;

    // ?????????????????????????????????????????????????????????????????????1/3???
    const offset = offsetY / 3;

    // ?????????????????????????????????????????????
    const action = offset - startDistance! < distance! ? REFRESH_STATE.pull : REFRESH_STATE.drop;

    this.doRefreshAction(action, offset);
    return true;
  };

  onDragEnd = (_event, { offsetY }): void => {
    // ??????????????????
    if (!offsetY) {
      return;
    }

    // ??????????????????????????????
    const { refreshState } = this.state;
    if (refreshState === REFRESH_STATE.pull) {
      this.doRefreshAction(REFRESH_STATE.normal);
      return;
    }

    // ?????????????????????????????????
    const { handler } = this.props.refresh!;
    if (typeof handler === 'function') {
      handler();
    }
  };

  /**
   * ????????????
   * @param  {number} options.offsetY  ????????????
   * @param  {number} options.animationDuration ??????????????????
   */
  doTransition = ({ offsetY, animationDuration }): void => {
    this.setState({ offsetY, animationDuration });
  };

  /**
   * ??????????????????
   * @param  {REFRESH_STATE} refreshState ????????????
   * @param  {number}        offsetY      ????????????
   */
  doRefreshAction = (refreshState: REFRESH_STATE, offsetY?: number): void => {
    const { animationDuration, stayTime } = this.props;

    this.setState({ refreshState });
    switch (refreshState) {
      case REFRESH_STATE.pull:
      case REFRESH_STATE.drop:
        this.doTransition({ offsetY, animationDuration: 0 });
        break;

      case REFRESH_STATE.loading:
        this.doTransition({ offsetY: 'auto', animationDuration });
        break;

      case REFRESH_STATE.success:
      case REFRESH_STATE.failure:
        this.doTransition({ offsetY: 'auto', animationDuration });
        setTimeout(() => {
          if (!this.mounted) return;
          this.doRefreshAction(REFRESH_STATE.normal);
          this.doLoadAction(LOAD_STATE.normal);
        }, stayTime);
        break;

      default:
        this.doTransition({ offsetY: 0, animationDuration });
    }
  };

  /**
   * ??????????????????
   * @param  {LOAD_STATE} loadState ????????????
   */
  doLoadAction = (loadState: LOAD_STATE): void => {
    const { stayTime } = this.props;
    this.setState({ loadState });

    switch (loadState) {
      case LOAD_STATE.success:
        this.doLoadAction(LOAD_STATE.normal);
        break;

      case LOAD_STATE.failure:
        setTimeout(() => {
          if (!this.mounted) return;
          this.doLoadAction(LOAD_STATE.abort);
        }, stayTime);
        break;

      default:
    }
  };

  /**
   * ??????????????????
   */
  renderRefresh = (): ReactNode => {
    const refresh: PullAction = { ...Pull.defaultProps.refresh, ...this.props.refresh };
    const { startDistance, distance, render } = refresh;
    const { refreshState, offsetY } = this.state;

    let percent = 0;
    if (offsetY >= startDistance!) {
      percent =
        ((offsetY - startDistance! < distance! ? offsetY - startDistance! : distance)! * 100) /
        distance!;
    }

    if (typeof render === 'function') {
      return render(refreshState, percent);
    }

    const { prefixCls, locale } = this.props;
    const cls = `${prefixCls}__control`;

    switch (refreshState) {
      case REFRESH_STATE.pull:
        return (
          <div className={cls}>
            <ActivityIndicator loading={false} percent={percent} />
            <span>{locale!.pullText}</span>
          </div>
        );

      case REFRESH_STATE.drop:
        return (
          <div className={cls}>
            <ActivityIndicator loading={false} percent={100} />
            <span>{locale!.dropText}</span>
          </div>
        );

      case REFRESH_STATE.loading:
        return (
          <div className={cls}>
            <ActivityIndicator type="spinner" />
            <span>{locale!.loadingText}</span>
          </div>
        );

      case REFRESH_STATE.success:
        return (
          <div className={cls}>
            <SuccessCircleIcon theme="success" />
            <span>{locale!.successText}</span>
          </div>
        );

      case REFRESH_STATE.failure:
        return (
          <div className={cls}>
            <WarningCircleIcon theme="danger" />
            <span>{locale!.failureText}</span>
          </div>
        );

      default:
    }
  };

  /**
   * ??????????????????
   */
  renderLoad = (): ReactNode => {
    const load: PullAction = { ...Pull.defaultProps.load, ...this.props.load };
    const { render } = load;
    const { loadState } = this.state;

    if (typeof render === 'function') {
      return render(loadState);
    }

    const { prefixCls, locale } = this.props;
    const cls = `${prefixCls}__control`;

    switch (loadState) {
      case LOAD_STATE.loading:
        return (
          <div className={cls}>
            <ActivityIndicator type="spinner" />
            <span>{locale!.loadingText}</span>
          </div>
        );

      case LOAD_STATE.failure:
        return (
          <div className={cls}>
            <WarningCircleIcon theme="danger" />
            <span>{locale!.failureText}</span>
          </div>
        );

      case LOAD_STATE.complete:
        return (
          <div className={cls}>
            <span>{locale!.completeText}</span>
          </div>
        );

      default:
    }
  };

  render() {
    const { prefixCls, className, style, children } = this.props;
    const { offsetY, animationDuration, refreshState, loadState } = this.state;
    const cls = classnames(prefixCls, className);

    const loadCls = classnames(`${prefixCls}__load`, {
      [`${prefixCls}__load--show`]: loadState >= LOAD_STATE.loading,
    });

    const contentStyle: CSSProperties = {
      WebkitTransition: `all ${animationDuration}ms`,
      transition: `all ${animationDuration}ms`,
    };

    if (refreshState <= REFRESH_STATE.drop) {
      contentStyle.WebkitTransform = `translate3d(0, ${offsetY}px, 0)`;
      contentStyle.transform = `translate3d(0, ${offsetY}px, 0)`;
    }

    return (
      <Drag onDragMove={this.onDragMove} onDragEnd={this.onDragEnd}>
        <div className={cls} style={style}>
          <div
            className={`${prefixCls}__content`}
            style={contentStyle}
            ref={(ele) => {
              this.pull = ele;
            }}
          >
            <div className={`${prefixCls}__refresh`}>{this.renderRefresh()}</div>
            <div className={`${prefixCls}__body`}>{children}</div>
            <div className={loadCls}>{this.renderLoad()}</div>
          </div>
        </div>
      </Drag>
    );
  }
}
