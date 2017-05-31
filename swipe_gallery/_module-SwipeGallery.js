/**
 * Swipe対応ギャラリー モジュール
 * - フェードイン/スライドに対応
 * - ページャー（またはサムネイルページャー）, 前へ/次へボタンを設置可
 */

let moduleSwipeGallery = function() {
    return {
        conf: {
            target: null, // スライダーの実行対象
            mainWrap: null, // targetの直下の要素
            mainList: null, // mainWrapの直下の要素
            mainListElem: null, // mainListの直下の要素群
            pager: null, // ページャー要素 スクリプト側で生成
            arrowPrev: null, // 前へのコントロール要素 スクリプト側で生成
            arrowNext: null, // 次へのコントロール要素 スクリプト側で生成
            mainWrapWidth: 0,
            elemWidth: 0, // mainListElemの幅（マージン含む）
            listWidth: 'auto', // mainList全体の幅（クローンした要素含む）
            listCountBase: 0, // クローン前のリスト内の要素数
            flgAnimated: false,
            flgTouchState: false,
            pagerElemClass: 'FnSwipeSliderPagerElem',
            arrowPrevClass: 'FnSwipeSliderPrev',
            arrowNextClass: 'FnSwipeSliderNext',
            timerID: 0, // 自動再生で使用するtimerID
            slideIndexOffset: 0, // クローン前の0番目の要素とクローン後の0番目の要素のindex値の差分
            canUseTransform: false, // CSS Transformが使えるかどうか
            startTouch: {
                x: 0,
                y: 0
            },
            startPos: {
                x: 0,
                y: 0
            },
            options: {
                mode: 'slide', // 'fade'または'slide'
                auto: false, // 自動再生の許可
                swipe: true, // スワイプ操作の許可
                centerMode: false, // 両隣に画像を表示させる場合
                showSlide: 1, // 一度に表示させるスライド数（現在は1のみ有効）
                transitionSpeed: 400, // fade, slideのスピード
                pagerUserClass: '', // ページャーにユーザー側で指定するクラス
                arrowUserClass: '', // 前/次のコントロールにユーザー側で指定するクラス
                useAbsolute: false, // スライド内の要素（画像など）がabsoluteで配置され、高さを可変にしたい場合はtrue
                aspectRatio: 0.525, // 高さの計算のため、useAbsolute指定時に合わせて指定する
                absoluteTarget: 'img', // aspectRatioの計算基準要素
                autoDelay: 4000, // 自動再生の待ち時間
                usePager: true, // ページャーを使用するか
                useThumbnail: false, // ページャーにサムネイルを使用するか
                useArrow: true // 前/次のコントロールを使用するか
            }
        },
        /**
         * 初期化
         * @param {string} el - HTMLセレクタ
         * @param {string} params - オプションの指定
         */
        init: function(el, params) {
            let self = this;
            let conf = self.conf;
            let options = conf.options;
            conf.target = document.querySelector(el);
            if(!conf.target) {
                return false;
            }
            self.extendObj(options, params);
            self.checkTransoform();
            self.setContent();
        },
        /**
         * オプションの上書き
         * @param {object} source - デフォルトのオプション
         * @param {object} extension - init時に指定したオプション
         */
        extendObj: function(source, extension) {
            let prop;
            for(prop in extension) {
                if(source.hasOwnProperty(prop)) {
                    source[prop] = extension[prop];
                }
            }
        },
        /**
         * スライダーのセット,ページャーの設定,イベント登録等、初期の表示準備
        */
        setContent: function() {
            let self = this;
            let conf = self.conf;
            let options = conf.options;
            let prependFragment = document.createDocumentFragment();
            let appendFragment = document.createDocumentFragment();
            let tmpClone;
            conf.mainWrap = conf.target.querySelector(self.getDirectChildElementName(conf.target));
            conf.mainList = conf.mainWrap.querySelector(self.getDirectChildElementName(conf.mainWrap));
            let mainListElemSelector = self.getDirectChildElementName(conf.mainList);
            conf.mainListElem = conf.mainList.querySelectorAll(mainListElemSelector);
            // クローン前の要素数を格納
            conf.listCountBase = conf.mainListElem.length;
            if(conf.listCountBase > 1) {
                // slideタイプの場合は、前後にクローンを配置
                if(options.mode === 'slide') {
                    // centerModeの場合、1つだけだと余白が見えてしまう恐れがあるため2つクローン
                    if(options.centerMode) {
                        conf.slideIndexOffset = 2;
                        options.showSlide = 1;
                    } else {
                        conf.slideIndexOffset = options.showSlide;
                    }
                    // 表示数に応じてスライドをクローンして前後に配置
                    for(let i = 0; i < conf.slideIndexOffset; i++) {
                        tmpClone = conf.mainListElem[i].cloneNode(true);
                        prependFragment.appendChild(tmpClone);
                    }
                    for(let j = conf.listCountBase - conf.slideIndexOffset; j < conf.listCountBase; j++) {
                        tmpClone = conf.mainListElem[j].cloneNode(true);
                        appendFragment.appendChild(tmpClone);
                    }
                    conf.mainList.appendChild(prependFragment);
                    conf.mainList.insertBefore(appendFragment, conf.mainList.firstChild);
                }
                // クローン分を追加した全要素を格納
                conf.mainListElem = conf.mainList.querySelectorAll(mainListElemSelector);
                // スライドにindexを付加
                for(let k = 0; k < conf.mainListElem.length; k++) {
                    conf.mainListElem[k].setAttribute('data-index', k - conf.slideIndexOffset);
                }
            }

            conf.mainListElem[conf.slideIndexOffset].className = 'ExCurrent';
            // スライドの幅、高さの設定
            self.setSlideSize(self);

            if(conf.listCountBase > 1) {
                // ページャーの構築
                if(options.usePager) {
                    self.setPager();
                }
                // 前/次 コントロールの構築
                if(options.useArrow) {
                    self.setArrow();
                }
                // 自動再生
                if(options.auto) {
                    self.autoPlay();
                }
                // スライドのスワイプイベント登録
                if(options.swipe) {
                    if(document.addEventListener) {
                        conf.mainList.addEventListener('touchstart', function(e) {
                            return self.onSlideTouchStart(e, self);
                        });
                        conf.mainList.addEventListener('touchmove', function(e) {
                            return self.onSlideTouchMove(e, self);
                        });
                        conf.mainList.addEventListener('touchend', function(e) {
                            return self.onSlideTouchEnd(e, self);
                        });
                    } else {
                        conf.mainList.attachEvent('touchstart', function(e) {
                            return self.onSlideTouchStart(e, self);
                        });
                        conf.mainList.attachEvent('touchmove', function(e) {
                            return self.onSlideTouchMove(e, self);
                        });
                        conf.mainList.attachEvent('touchend', function(e) {
                            return self.onSlideTouchEnd(e, self);
                        });
                    }
                }
            }
            // リサイズ、ロード時にスライドのサイズをリセット
            if(document.addEventListener) {
                window.addEventListener('resize', function() {
                    return self.setSlideSize(self);
                });
                window.addEventListener('load', function() {
                    return self.setSlideSize(self);
                });
            } else {
                window.attachEvent('onload', function() {
                    return self.setSlideSize(self);
                });
            }
        },
        /**
         * スライドの幅、高さ等の調整
         */
        setSlideSize: function(self) {
            let conf = self.conf;
            let options = conf.options;
            let elemBaseWidth;
            let elemOuterWidth;
            let elemBaseHeight;
            let elemOuterHeight;
            let mainListElemStyle = self.getStyle(conf.mainListElem[conf.slideIndexOffset]);
            let slideCurrentIndex = self.getIndexes().slideCurrent;
            conf.mainListElem[conf.slideIndexOffset].style.height = 'auto';
            conf.mainWrapWidth = parseInt(self.getStyle(conf.mainWrap, 'width'), 10);

            // padding, margin, borderを含めた幅を距離計算の基準として設定する
            if(mainListElemStyle.boxSizing === 'border-box' ||
                mainListElemStyle.WebkitBoxSizing === 'border-box' ||
                mainListElemStyle.MozBoxSizing === 'border-box') {
                elemOuterWidth = self.getOuterSize(conf.mainListElem[conf.slideIndexOffset], true, 'width');
                elemOuterHeight = self.getOuterSize(conf.mainListElem[conf.slideIndexOffset], true, 'height');
            } else {
                elemOuterWidth = self.getOuterSize(conf.mainListElem[conf.slideIndexOffset], false, 'width');
                elemOuterHeight = self.getOuterSize(conf.mainListElem[conf.slideIndexOffset], false, 'height');
            }
            elemBaseWidth = parseInt(self.getStyle(conf.mainListElem[conf.slideIndexOffset], 'width'), 10);
            // 画像のサイズがうまく取得できていなければ再度実行
            if(elemBaseWidth <= 0) {
                return setTimeout(function() {
                    self.setSlideSize(self);
                }, 100);
            }
            // centerModeじゃなければラッパーを計算の基準にする
            if(options.centerMode) {
                conf.elemWidth = elemOuterWidth;
            } else {
                conf.elemWidth = conf.mainWrapWidth;
            }
            // スライド内の要素にabsoluteを使用したい場合、アスペクト比のオプションをつかって調整する
            if(options.useAbsolute) {
                elemBaseHeight =  conf.mainListElem[conf.slideIndexOffset].querySelectorAll(options.absoluteTarget) * options.aspectRatio;
            } else {
                elemBaseHeight = parseInt(self.getStyle(conf.mainListElem[conf.slideIndexOffset], 'height'), 10);
            }
            // スライドの幅と高さをセット
            for(let i = 0; i < conf.mainListElem.length; i++) {
                conf.mainListElem[i].style.width = elemBaseWidth + 'px';
                conf.mainListElem[i].style.height = elemBaseHeight + 'px';
            }
            // スライドの初期表示の設定
            if(options.mode === 'slide') {
                conf.listWidth = conf.elemWidth * (conf.listCountBase + conf.slideIndexOffset * 2);
                conf.mainList.style.width = conf.listWidth + 'px';
                self.changeSlide(slideCurrentIndex);
            } else {
                for(let j = 0; j < conf.listCountBase; j++) {
                    if(!self.hasClass(conf.mainListElem[j], 'ExCurrent')) {
                        conf.mainListElem[j].style.opacity =  0;
                    } else {
                        conf.mainListElem[j].style.opacity =  1;
                    }
                }
            }
            conf.mainWrap.style.height = elemOuterHeight + 'px';
            conf.mainList.style.height = elemOuterHeight + 'px';
        },
        /**
         * 前/次 コントロールの設置
         */
         setArrow: function() {
            let self = this;
            let conf = self.conf;
            let options = conf.options;
            let docFragment = document.createDocumentFragment();
            // 前へコントロールの生成
            let arrowPrev = document.createElement('div');
            let arrowPrevChild = document.createElement('span');
            arrowPrevChild.textContent = '前へ';
            arrowPrev.appendChild(arrowPrevChild);
            arrowPrev.className = conf.arrowPrevClass + ' ' + options.arrowUserClass + ' ExPrev';
            docFragment.appendChild(arrowPrev);
            // 次へコントロールの生成
            let arrowNext = document.createElement('div');
            let arrowNextChild = document.createElement('span');
            arrowNextChild.textContent = '次へ';
            arrowNext.appendChild(arrowNextChild);
            arrowNext.className = conf.arrowNextClass + ' ' + options.arrowUserClass + ' ExNext';
            docFragment.appendChild(arrowNext);
            // コントロールの追加
            conf.target.appendChild(docFragment);
            conf.arrowPrev = arrowPrev;
            conf.arrowNext = arrowNext;
            // クリックイベント登録
            if(document.addEventListener) {
                conf.arrowPrev.addEventListener('click', function(e) {
                    return self.onArrowClick(e, self);
                });
                conf.arrowNext.addEventListener('click', function(e) {
                    return self.onArrowClick(e, self);
                });
            } else {
                conf.arrowPrev.attachEvent('onclick', function(e) {
                    return self.onArrowClick(e, self);
                });
                conf.arrowNext.attachEvent('onclick', function(e) {
                    return self.onArrowClick(e, self);
                });
            }
        },
        /**
         * ページャーの設置
         */
        setPager: function() {
            let self = this;
            let conf = self.conf;
            let options = conf.options;
            // ページャーを生成、１つ目の要素にカレントクラスを付加
            conf.pager = document.createElement('div');
            conf.pager.className = options.pagerUserClass;
            let pagerUl = document.createElement('ul');
            let pagerLi;
            for(let i = 0; i < conf.listCountBase; i++) {
                pagerLi = document.createElement('li');
                pagerLi.textContent = i + 1;
                pagerLi.className = conf.pagerElemClass;
                if(i === 0) {
                    pagerLi.className = pagerLi.className + ' ' + 'ExCurrent';
                }
                pagerLi.setAttribute('data-index', i);
                pagerUl.appendChild(pagerLi);
            }
            conf.pager.appendChild(pagerUl);
            conf.target.appendChild(conf.pager);
            // イベント登録
            if(document.addEventListener) {
                conf.pager.addEventListener('click', function(e) {
                    return self.onPagerClick(e, self);
                });
            } else {
                conf.pager.attachEvent('onclick', function(e) {
                    return self.onPagerClick(e, self);
                });
            }
            // ページャーにサムネイルを使用する場合の処理
            if(options.useThumbnail) {
                self.setThumbnail();
            }
        },
        /**
         * options.useThumbnailがtrueの場合、メイン画像のsrcをつかってページャーの背景画像を設定
         */
        setThumbnail: function() {
            let self = this;
            let conf = self.conf;
            let src;
            for(let i = 0; i < conf.listCountBase; i++) {
                src = conf.mainListElem[i + conf.slideIndexOffset].querySelector('img').getAttribute('src');
                conf.pager.querySelectorAll('li')[i].style.backgroundImage = 'url(' + src + ')';
                conf.pager.querySelectorAll('li')[i].style.WebkitBackgroundSize = 'cover';
                conf.pager.querySelectorAll('li')[i].style.backgroundSize = 'cover';
                conf.pager.querySelectorAll('li')[i].style.backgroundPosition = 'center';
                conf.pager.querySelectorAll('li')[i].style.backgroundRepeat = 'no-repeat';
            }
        },
        /**
         * 前/次 コントロールのクリックイベント
         */
        onArrowClick: function(e, self) {
            let conf = self.conf;
            let options = conf.options;
            let eventTarget = e.target || e.srcElement;
            let diffIndex;
            let indexes;

            if(!conf.flgAnimated) {
                // クリックされた要素がページャーであれば、処理を実行
                if(self.hasClass(eventTarget, conf.arrowNextClass) || self.hasClass(eventTarget.parentNode, conf.arrowNextClass)) {
                    // 次へ クリック時
                    diffIndex = 1;

                } else if(self.hasClass(eventTarget, conf.arrowPrevClass) || self.hasClass(eventTarget.parentNode, conf.arrowPrevClass)) {
                    // 前へ クリック時
                    diffIndex = -1;
                } else {
                    return false;
                }
                conf.flgAnimated = true;
                clearInterval(conf.timerID);
                indexes = self.getIndexes(diffIndex);
                // ページャーの処理
                if(options.usePager && conf.pager) {
                    self.handleCurrentClass(indexes.pagerNext, 'pager');
                }
                // スライドの処理
                self.changeSlide(indexes.slideCurrent, indexes.slideNext);
                // 自動再生の再開
                if(options.auto) {
                    self.autoPlay();
                }
            }
         },
        /**
         * ページャーのクリックイベント
         */
        onPagerClick: function(e, self) {
            let conf = self.conf;
            let options = conf.options;
            let eventTarget = e.target || e.srcElement;
            let indexes = self.getIndexes(null, eventTarget);
            // クリックされた要素がページャーであれば、処理を実行
            if(!conf.flgAnimated) {
                if(self.hasClass(eventTarget, conf.pagerElemClass)) {
                    conf.flgAnimated = true;
                    clearInterval(conf.timerID);
                    // ページャーの処理
                    if(options.usePager && conf.pager) {
                        self.handleCurrentClass(indexes.pagerNext, 'pager');
                    }
                    // スライドの処理
                    self.changeSlide(indexes.slideCurrent, indexes.slideNext);
                    // 自動再生の再開
                    if(options.auto) {
                        self.autoPlay();
                    }
                }
            }
        },
        /**
         * touchstartイベント touchstart時の座標等取得
        */
        onSlideTouchStart: function(e, self) {
            let conf = self.conf;
            if(!conf.flgAnimated) {
                clearInterval(conf.timerID);
                conf.flgAnimated = true;
                conf.flgTouchState = true;
                conf.startTouch.x = e.changedTouches[0].pageX;
                conf.startTouch.y = e.changedTouches[0].pageY;
                conf.startPos.x = self.getPosValue(conf.mainList);
            }
        },
        /**
         * touchmoveイベント スワイプに応じてスライダーを動かす
        */
        onSlideTouchMove: function(e, self) {
            let conf = self.conf;
            let options = conf.options;
            let moveX;
            let tmpMoveX = conf.startTouch.x - e.changedTouches[0].pageX || 1;
            let tmpMoveY = conf.startTouch.y - e.changedTouches[0].pageY;
            let distanceRatio = tmpMoveX / tmpMoveY;
            if(!conf.flgTouchState) {
                return false;
            }
            if(Math.abs(distanceRatio) > Math.tan(30 * Math.PI/180)) {
                e.preventDefault();
            }
            // スライドの場合はtouchmove中の位置を取得する
            if(options.mode === 'slide') {
                moveX = conf.startPos.x - (conf.startTouch.x - e.changedTouches[0].pageX);
                if(conf.canUseTransform) {
                    conf.mainList.style.WebkitTransform = 'translate(' + moveX + 'px, 0px)';
                    conf.mainList.style.transform = 'translate(' + moveX + 'px, 0px)';
                } else {
                    conf.mainList.style.left = moveX + 'px';
                }
            }
        },
        /**
         * touchendイベント touchend時の位置に応じてスライドを動かす
        */
        onSlideTouchEnd: function(e, self) {
            let conf = self.conf;
            let options = conf.options;
            let indexes;
            let diffIndex = 0;
            let fadeTrigger = 80;
            let lastTouched = e.changedTouches[0].pageX;
            let currentPosX = self.getPosValue(conf.mainList);

            if(!conf.flgTouchState) {
                return false;
            }
            conf.flgTouchState = false;
            if(options.mode === 'slide') {
                // スライドの場合の処理
                if((conf.startPos.x - conf.elemWidth / 3) > currentPosX) {
                    diffIndex = 1;
                } else if((currentPosX - conf.elemWidth / 3) > conf.startPos.x) {
                    diffIndex = -1;
                }
            } else {
                // フェードの場合の処理
                if(conf.startTouch.x - lastTouched > fadeTrigger) {
                    diffIndex = 1;
                } else if(lastTouched - conf.startTouch.x > fadeTrigger) {
                    diffIndex = -1;
                }
            }
            indexes = self.getIndexes(diffIndex);
            // ページャーの処理
            if(options.usePager) {
                self.handleCurrentClass(indexes.pagerNext, 'pager');
            }
            // スライドの処理
            if(!(options.mode === 'fade' && diffIndex === 0)) {
                self.changeSlide(indexes.slideCurrent, indexes.slideNext, currentPosX, true);
            } else {
                conf.flgAnimated = false;
            }
            conf.touhState = false;
            // 自動再生の再開
            if(options.auto) {
                self.autoPlay();
            }
        },
        /**
         * スライドの切り替え
         * @param {number} currentIndex - 現在のカレントのインデックス
         * @param {number} nextIndex - 次のカレントのインデックス
         * @param {number} touchEndPos - touchend時の位置
         * @param {number} touchMove - スワイプによって実行されたかどうか
         */
        changeSlide: function(currentIndex, nextIndex, touchEndPos, touchMove) {
            let self = this;
            let conf = self.conf;
            let options = conf.options;
            let startDate = +new Date();
            let mainWrapWidth = conf.mainWrapWidth;
            let elemWidth = conf.elemWidth;
            let indexOffset = conf.slideIndexOffset;
            let adjustValue = (mainWrapWidth - elemWidth) / 2;
            let progress = 0;
            let speed;
            let startValue;
            let changeValue;
            let setValue;
            let fadeInStart = 0;
            let fadeOutStart = 1;

            if(!conf.flgAnimated) {
                conf.flgAnimated = true;
            }
            if(nextIndex === undefined) {
                nextIndex = currentIndex;
            }
            if(options.mode === 'slide') {
                // 現在値と変化値の設定
                startValue = touchEndPos ? touchEndPos : -conf.elemWidth * (currentIndex + indexOffset) + adjustValue;
                changeValue = (conf.elemWidth * -(nextIndex + indexOffset)  + adjustValue) - startValue;
                // スワイプの場合はスピードを若干早く
                speed = touchMove ? options.transitionSpeed * 0.6 : options.transitionSpeed;
            } else {
                speed = options.transitionSpeed;
            }
            // requestAnimationFrame/setTimeout で実行する処理
            let tick = function() {
                // 進行度を取得してスタイルの代入値を調整
                progress = (+new Date() - startDate) / speed;

                if(progress >= 1) {
                    progress = 1;
                }
                if(options.mode === 'fade') {
                    conf.mainListElem[currentIndex].style.opacity =  fadeOutStart - progress;
                    conf.mainListElem[nextIndex].style.opacity = fadeInStart + progress;
                } else {
                    setValue = startValue + changeValue * progress;
                    if(conf.canUseTransform) {
                        conf.mainList.style.WebkitTransform = 'translate(' + setValue + 'px, 0px)';
                        conf.mainList.style.transform = 'translate(' + setValue + 'px, 0px)';
                    } else {
                        conf.mainList.style.left = setValue + 'px';
                    }
                }
                // 進行度が1になるまで処理を繰り返す
                if (progress !== 1) {
                    if(window.requestAnimationFrame) {
                         requestAnimationFrame(tick);
                    } else {
                        setTimeout(tick, 1000 / 60);
                    }
                } else {
                    self.handleCurrentClass(nextIndex + indexOffset, 'slide');
                    conf.flgAnimated = false;
                    // スライドが見切れないように一定距離進んだら位置を調整する
                    if(options.mode === 'slide') {
                        if(nextIndex < 0 || nextIndex >= conf.listCountBase) {
                            currentIndex = nextIndex;
                            if(nextIndex < 0) {
                                nextIndex = nextIndex + conf.listCountBase;
                            } else {
                                nextIndex = nextIndex - conf.listCountBase;
                            }
                            setValue = -conf.elemWidth * (nextIndex + indexOffset) + adjustValue;
                            if(conf.canUseTransform) {
                                conf.mainList.style.WebkitTransform = 'translate(' + setValue + 'px, 0px)';
                                conf.mainList.style.transform = 'translate(' + setValue + 'px, 0px)';
                            } else {
                                conf.mainList.style.left = setValue + 'px';
                            }
                            self.handleCurrentClass(nextIndex + indexOffset, 'slide');
                        }
                    }
                }
            };
            tick();
        },
        /**
         * 自動再生
         */
        autoPlay: function() {
            let self = this;
            let conf = self.conf;
            let options = conf.options;
            if(!conf.flgTouchState) {
                conf.timerID = setInterval(function() {
                    let currentSlideIndex = +conf.mainList.querySelector('.ExCurrent').getAttribute('data-index');
                    let nextSlideIndex = currentSlideIndex + 1;
                    if(options.mode === 'fade') {
                        nextSlideIndex = nextSlideIndex % conf.listCountBase;
                    }
                    self.changeSlide(currentSlideIndex, nextSlideIndex);

                    if(options.usePager) {
                        let pagerCurrentIndex =  conf.pager.querySelector('.ExCurrent').getAttribute('data-index');
                        let pagerNextIndex = (pagerCurrentIndex + 1) % conf.listCountBase;
                        self.handleCurrentClass(pagerNextIndex, 'pager');
                    }

                }, options.autoDelay);
            }
        },
        /**
         * ページャー/スライドのカレント処理
         * @param {number} index - 次にカレントにする要素のインデックス
         */
        handleCurrentClass: function(index, targetType) {
            let self = this;
            let conf = self.conf;
            if(targetType === 'pager') {
                self.removeClass(conf.pager.querySelector('.ExCurrent'), 'ExCurrent');
                self.addClass(conf.pager.querySelectorAll('li')[index], 'ExCurrent');
            } else if(targetType === 'slide'){
                self.removeClass(conf.mainList.querySelector('.ExCurrent'), 'ExCurrent');
                self.addClass(conf.mainListElem[index], 'ExCurrent');
            }
        },
        /**
         * ページャー/スライドのindexを取得
         * index値の差がわかる場合は、diffに値を指定。ページャーまたはスライドのイベントターゲットがわかる場合は、etPager/etSlideを指定
         * 指定する値がなければnull
         * @param {number} diff - index値の差
         * @param {object} etPager - ページャーのイベントターゲット
         * @param {object} etSlide - スライドのイベントターゲット
         * @return {object} - ページャー/スライドの現在のカレント、次のカレントのインデックスを格納したオブジェクトを返す
         */
        getIndexes: function(diff, etPager, etSlide) {
            let self = this;
            let conf = self.conf;
            let options = conf.options;
            let pagerCurrentIndex;
            let pagerNextIndex;
            let slideCurrentIndex;
            let slideNextIndex;
            let diffIndex = diff;
            // ページャーの処理
            if(options.usePager && conf.pager) {
                pagerCurrentIndex =  +conf.pager.querySelector('.ExCurrent').getAttribute('data-index');
                if(diffIndex !== null) {
                    pagerNextIndex = (pagerCurrentIndex + diff + conf.listCountBase) % conf.listCountBase;
                } else if(etPager) {
                    pagerNextIndex = +etPager.getAttribute('data-index');
                    diffIndex = pagerNextIndex - pagerCurrentIndex;
                }
            }
            // スライドの処理
            slideCurrentIndex = +conf.mainList.querySelector('.ExCurrent').getAttribute('data-index');
            if(diffIndex !== null) {
                if(options.mode === 'slide') {
                    slideNextIndex = slideCurrentIndex + diffIndex;
                } else {
                    slideNextIndex = (slideCurrentIndex + conf.listCountBase + diffIndex) % conf.listCountBase;
                }
            } else if(etSlide) {
                slideNextIndex = +etSlide.getAttribute('data-index');
            }
            return {
                pagerCurrent: pagerCurrentIndex,
                pagerNext: pagerNextIndex,
                slideCurrent: slideCurrentIndex,
                slideNext: slideNextIndex
            };
        },
        /**
         * 現在の位置を取得
         */
        getPosValue: function(el) {
            let self = this;
            let conf = self.conf;
            let reg = new RegExp(/translate\((-?\d+(?:\.\d*)?)(?:px)?,\s?(-?\d+(?:\.\d*)?)(?:px)?\)/);
            let translate;
            if(el.style.transform) {
                translate = el.style.transform.match(reg);
            } else if(el.style.WebkitTransform) {
                translate = el.style.WebkitTransform.match(reg);
            }
            if(conf.options.mode === 'slide') {
                if(conf.canUseTransform) {
                    return +translate[1];
                } else {
                    return parseInt(conf.mainList.style.left, 10);
                }
            } else {
                return 0;
            }

        },
        /**
         * translateプロパティが使えるかをチェック 真偽値をconf.canUserTransformに設定
         */
        checkTransoform: function() {
            let self = this;
            let conf = self.conf;
            let style = document.createElement('div').style;
            if('transform' in style || 'WebkitTransform' in style) {
                style.WebkitTransform = 'translate(0px, 0px)';
                style.transform = 'translate(0px, 0px)';
                // Android2系は挙動がtransformの挙動が怪しいため、transformのフラグをfalseに
                if((style.transform !== '') && (!/Android 2/.test(navigator.userAgent))) {
                    conf.canUseTransform = true;
                }
            }
        },
        /**
         * outerWidth/outerHeightの取得
         * @param {object} el - HTMLオブジェクト
         * @param {boolean} boxSizing
                true: border-box
                false: content-box
         * @return {number} sum - widthまたはheightの数値
         */
        getOuterSize: function(el, boxSizing, type) {
            let self = this;
            let style = self.getStyle(el);
            let sum = 0;

            if(window.getComputedStyle) {
                if(type === 'width') {
                    sum += parseInt(style.width, 10);
                    sum += parseInt(style.marginLeft, 10);
                    sum += parseInt(style.marginRight, 10);
                    if(!boxSizing) {
                        sum += parseInt(style.paddingLeft, 10);
                        sum += parseInt(style.paddingRight, 10);
                        sum += parseInt(style.borderLeftWidth, 10);
                        sum += parseInt(style.borderRightWidth, 10);
                    }
                } else if(type === 'height') {
                    sum += parseInt(style.height, 10);
                    sum += parseInt(style.marginTop, 10);
                    sum += parseInt(style.marginBottom, 10);
                    if(!boxSizing) {
                        sum += parseInt(style.paddingTop, 10);
                        sum += parseInt(style.paddingBottom, 10);
                        sum += parseInt(style.borderTopWidth, 10);
                        sum += parseInt(style.borderBottomWidth, 10);
                    }
                }
            } else {
                if(type === 'width') {
                    sum += parseInt(el.clientWidth, 10);
                } else if(type === 'height') {
                    sum += parseInt(el.clientHeight, 10);
                }
            }
            return sum;
        },
        /**
         * 直下の要素名を取得 childrenはIE8以下で不安定のため、childNodesでループ
         * @param {object} el - HTMLオブジェクト
         * @return {string} - 直下のElementNodeのノード名
         */
        getDirectChildElementName: function(el) {
            let childNodes = el.childNodes;
            for(let i = 0; i < childNodes.length; i++) {
                if(childNodes[i].nodeType === 1) {
                    return childNodes[i].nodeName;
                }
            }
        },
        /**
         * getComputedStyleかCurrentStyle(IE8)の値を返す
         * @param {object} el - HTMLオブジェクト
         * @return {string} prop - プロパティ名
         */
        getStyle: function(el, prop) {
            if(window.getComputedStyle) {
                if(prop) {
                    return window.getComputedStyle(el, null)[prop];
                }
                return window.getComputedStyle(el, null);
            } else {
                if(prop) {
                    // propがwidthかheightであれば、それぞれclientWidth/clientHeightを返す
                    if(prop === 'width') {
                        return el.clientWidth;
                    }  else if(prop === 'height') {
                        return el.clientHeight;
                    } else {
                        return 0;
                    }
                } else {
                    return el.currentStyle;
                }

            }

        },
        /**
         * HTML要素が指定したクラスをもっているかを判定
         * @param {object} el - HTMLオブジェクト
         * @param {string} className - クラス名
         * @return {boolean} クラス名がマッチしたかの真偽値を返す
         */
        hasClass: function(el, className) {
            if (el.classList) {
                return el.classList.contains(className);
            } else {
                return new RegExp('(\\s|^)' + className + '(\\s|$)').test(el.className);
            }
        },
        /**
         * HTML要素に指定したクラスを追加
         * @param {object} el - HTMLオブジェクト
         * @param {string} className - クラス名
         */
        addClass: function(el, className) {
            let self = this;
            if(el.classList) {
                el.classList.add(className);
            } else {
                if(!self.hasClass(el, className)) {
                    el.className += ' ' + className;
                }
            }
        },
        /**
         * 要素から指定したクラスを削除
         * @param {object} el - HTMLオブジェクト
         * @param {string} className - クラス名
         */
        removeClass: function(el, className) {
            let self = this;
            if(el.classList) {
                el.classList.remove(className);
            } else if(self.hasClass(el, className)){
                el.className = el.className.replace(new RegExp('(\\s|^)' + className + '(\\s|$)'), ' ');
            }
        }
    };
};

module.exports = moduleSwipeGallery;