import React, {Component} from 'react';
import {
  StyleSheet,
  View,
  Image,
  Text,
  Modal,
  Dimensions,
  Slider,
  Platform,
  Vibration,
  NativeModules,
} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {SafeAreaView} from 'react-native-safe-area-context';
import PageTop from '../../components/page-top';
import {scaleSizeW} from '../../utils/util';
import CameraPage from '../camera';
import {AliyunOSS} from 'rn-alioss';
import {ossUpload} from '../../utils/oss-upload';
import {aiImgIdentify, getStsToken} from '../../api/api';
import Config from '../../utils/config';
import {isANDROID, isIOS} from '../../utils/util';
import userHelper from '../../helper/userHelper';
import Load from '../../components/load';
import AiIdentificationListView from './components/AiIdentificationList';
import Toast from '../../utils/toast';
import Colors from '../../utils/colors';
import imagePickHelper from '../../helper/imagePickHelper';
import TipMask from './components/tip-mask.js';
import LinearGradient from 'react-native-linear-gradient';
import ShapeClassListView from './components/ShapeClassListView.js';
import RNLxa from 'react-native-lxa';

const configuration = {
  maxRetryCount: 3,
  timeoutIntervalForRequest: 30,
  timeoutIntervalForResource: 24 * 60 * 60,
};
export default class PriceQueryAICameraView extends Component {
  constructor(props) {
    super(props);
    let resultImage = props.route.params?.resultImage;
    let category_id = props.route.params?.cid;
    this.state = {
      image: '',
      resultImage: resultImage,
      lightson: false,
      stop: false,
      categories: [
        {
          image:
            'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/bagnormal.png',
          selectedimage:
            'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/bagselected.png',
          name: '箱包',
          selected: true,
          id: 1,
          tip: '请将箱包主体放在虚线框内',
          frameurl:
            'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/interestbagarea.png',
          exampleurl:
            'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/takephotobagexample.png',
        },
        {
          image:
            'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/watchnormal.png',
          selectedimage:
            'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/watchselected.png',
          name: '腕表',
          selected: false,
          id: 157,
          tip: '请将腕表主体放在虚线框内',
          frameurl:
            'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/takephotowatchframe.png',
          exampleurl:
            'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/takephotowatchexample.png',
        },
        {
          image:
            'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/shoushinormal.png',
          selectedimage:
            'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/shoushiselected.png',
          name: '首饰',
          selected: false,
          id: 159,
          tip: '请将首饰主体放在虚线框内',
          frameurl:
            'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/takephotoshoushiframe.png',
          exampleurl:
            'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/takephotoshoushiexample.png',
        },
        {
          image:
            'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-bus/ai/icon_shoe_simple_select.png',
          selectedimage:
            'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-bus/ai/icon_shoe_simple.png',
          name: '鞋靴',
          selected: false,
          id: 160,
          tip: '请将鞋靴主体放在线框内',
          frameurl:
            'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-bus/ai/icon_shoe_large.png',
          exampleurl:
            'https://oss-dev.leixiaoan.com/crm/image/202285/1659666109584EPinP.jpg',
        },
      ],
      cropRect: null,
      loading: false,
      listvisiable: false,
      identitylist: [],
      videoZoom: 1,
      imagePath: '',
      pickedImagePath: '',
      resultimageurl: '',
      showSame: false,
      photoType: 0,
      showTip: false,
      category_id: category_id,
      recognized_cid: undefined,
      recognized_pic_url: undefined,
      metaData: null,
      showExchange: false,
      showswitch: false,
      useOld: false,
    };
  }

  //每隔三秒校验一次，看是否上传成功，上传成功，则开始跳转
  countDownTime() {
    this.timer = setInterval(() => {
      if (this.state.resultimageurl.length > 0) {
        this.dealImageResult(this.state.resultimageurl);
        clearInterval(this.timer);
        this.timer = null;
        return;
      }
    }, 3000);
  }

  componentWillUnmount() {
    this._navListener = null;
    // this._navListener1 = null;
    this.timer && clearInterval(this.timer);
  }

  componentDidMount() {
    this.getOssToken();
    //  ai查价流量
    if (this.props.route.params?.resultImage) {
      this.setState({
        stop: true,
        resultimageurl: this.props.route.params?.resultImage,
        showSame: true,
      });
    }
    this._navListener = this.props.navigation.addListener('blur', () => {
      this.setState({
        stop: true,
        pickedImagePath: '',
      });
    });
    if (Platform.OS == 'ios') {
      let version = NativeModules.RNVersionHelper;
      version.fetchAppVersion((appv, businessv) => {
        if (appv == '2.4.5') {
          this.setState({
            showswitch: false,
          });
        } else {
          this.setState({
            showswitch: true,
          });
        }
      });
    } else {
      this.setState({
        showswitch: false,
      });
    }
  }

  getOssToken() {
    getStsToken()
      .then(function (result) {
        const data = result.data;
        AliyunOSS.initWithSecurityToken(
          data.credentials.SecurityToken,
          data.credentials.AccessKeyId,
          data.credentials.AccessKeySecret,
          data.aliyun_oss_endpoint,
          configuration,
        );
      })
      .catch(function (err) {
        console.log(err);
      });
  }

  takePhotoAction() {
    this.setState({photoType: 2});
    this.camera.takePhoto();
    this.countDownTime();
  }

  async imagePicked(list) {
    let imageList = list ? JSON.parse(list) : [];
    if (!imageList || imageList.length == 0) {
      return;
    }
    let res = imageList?.[0] || {};
    this.countDownTime();
    if (res && res.mime && res.mime.indexOf('video') != -1) {
      Toast.show('当前仅支持图片识别，您选择的是视频，请重新选择！');
      return;
    }
    if (res && res.size >= 4 * 1024 * 1024) {
      Toast.show('当前图片体积大于20M,请重新选择！');
      return;
    }
    if (
      !res ||
      !res.mime ||
      (res.mime.indexOf('jpeg') == -1 &&
        res.mime.indexOf('png') == -1 &&
        res.mime.indexOf('jpg') == -1 &&
        res.mime.indexOf('bmp') == -1 &&
        res.mime.indexOf('gif') == -1 &&
        res.mime.indexOf('webp') == -1 &&
        res.mime.indexOf('tiff') == -1 &&
        res.mime.indexOf('ppm') == -1)
    ) {
      Toast.show('图片格式不符合要求，请重新选择！');
      return;
    }
    this.setState({
      stop: true,
      pickedImagePath: res.path,
      loading: true,
    });
    const images = await ossUpload(1, Config.bucket, res, Config.cdnUrl, true);
    if (images.length > 0) {
      let image = images[0];
      this.setState({
        resultimageurl: image,
        photoType: 1,
      });
    }
  }

  choosePhotoFromAlbum() {
    if (Platform.OS === 'ios') {
      let picker = NativeModules.RNAlbumPickerManager;
      if (picker) {
        picker.pickImage(1, 1, res => {
          this.uploadImages(res.images);
        });
      }
    } else {
      const imageHelper = NativeModules.RnImageHelper;
      if (imageHelper != null) {
        //安卓修改图片裁剪
        imagePickHelper.selectImage({quality: 10000, maxSelect: 1}, res => {
          let images = JSON.parse(res);
          if (images && Array.isArray(images) && images.length > 0) {
            this.uploadImages(images);
          }
        });
      }
    }
  }

  async uploadImages(images) {
    try {
      this.setState({loading: true});
      let result = await ossUpload(
        2,
        Config.bucket,
        images,
        Config.cdnUrl,
        false,
      );
      this.setState({
        resultimageurl: result[0],
        photoType: 2,
        showSame: true,
        loading: false,
      });
    } catch (e) {
      console.log(e);
      this.setState({loading: false});
    }
  }
  pickImageAction() {
    if (Platform.OS === 'ios') {
      let picker = NativeModules.RNAlbumPickerManager;
      if (picker) {
        picker.pickImage(1, 1, res => {
          this.uploadImages(res.images);
        });
      }
    } else {
      const imageHelper = NativeModules.RnImageHelper;
      if (imageHelper != null) {
        //安卓修改图片裁剪
        imagePickHelper.selectImage({quality: 10000, maxSelect: 1}, res => {
          let images = JSON.parse(res);
          if (images && Array.isArray(images) && images.length > 0) {
            this.uploadImages(images);
          }
        });
      }
    }
  }

  async onRecognizeObject(event) {
    let url; // = event.nativeEvent.path; //本地路径
    let pickedImagePath = '';
    let photoType;
    let category;
    if (event.path || event.objImagePath) {
      url = event.path; //event.objImagePath ? event.objImagePath : event.path;
      category = event.category;
      photoType = 1;
      pickedImagePath = url; //从相册选取的
    } else if (event.nativeEvent?.path) {
      url = event.nativeEvent?.path; //event.nativeEvent?.objImagePath
      //? event.nativeEvent?.objImagePath
      //: event.nativeEvent?.path;
      category = event.nativeEvent?.category;
      photoType = 2;
    }
    if (category) {
      category = category.toUpperCase();
    }
    // NSArray *categorys = @[@"handBags", @"Watch", @"shoes", @"Accessory"];
    let categories = {
      HANDBAGS: 1,
      WATCH: 157,
      SHOES: 160,
      ACCESSORY: 159,
    };
    let cid;
    if (category) {
      cid = categories[category];
    }
    this.setState({
      stop: true,
      loading: true,
      pickedImagePath: pickedImagePath,
      metaData: event.metaData ? event.metaData : event.nativeEvent?.metaData, //event.nativeEvent.metaData || null,
    });
    const images = await ossUpload(
      1,
      Config.bucket,
      {path: url, mime: '/jpeg', size: 20000},
      Config.cdnUrl,
      true,
    );
    let current_cid = this.state.categories.find(d => {
      return d.selected;
    })?.id;
    if (images.length > 0) {
      let image = images[0];
      this.setState({
        recognized_cid: cid,
        recognized_pic_url: image,
        photoType: photoType,
        loading: true, //cid != currentcid,
        pickedImagePath: pickedImagePath,
      });
      if (cid == undefined) {
        this.setState({showSame: true, resultimageurl: image});
      }
      if (current_cid == cid) {
        this.setState({showSame: true, resultimageurl: image});
      }
    }
  }

  async onTakePhoto(event) {
    this.setState({stop: true, loading: true});
    let url = event?.nativeEvent?.path; //本地路径
    const images = await ossUpload(
      1,
      Config.bucket,
      {path: url, mime: '/jpeg', size: 20000},
      Config.cdnUrl,
      true,
    );
    if (images.length > 0) {
      let image = images[0];
      this.setState({showSame: true, resultimageurl: image, photoType: 2});
    }
  }

  dealImageResult(image) {
    let cid;
    if (
      this.state.categories.filter(dt => {
        return dt.selected;
      }).length > 0
    ) {
      cid = this.state.categories.filter(dt => {
        return dt.selected;
      })[0].id;
    }
    this.setState({
      category_id: cid,
    });
  }

  async getairesult(url) {
    if (isANDROID()) {
      let self = this;
      this.props.navigation.replace('AiResult', {
        url: url,
        category_id: this.state.categories.filter(dt => {
          return dt.selected;
        })[0].id,
        callBack: () => {
          userHelper.getToken().then(value => {
            self.props.navigation.push('AndroidIdentifyPage', {
              token: value,
              fetchData: self.getairesult.bind(this),
            });
          });
        },
      });
    } else {
      this.props.navigation.push('AiResult', {
        url: url,
        category_id: this.state.categories.filter(dt => {
          return dt.selected;
        })[0].id,
      });
    }
  }

  categoryNotPairView() {
    let recognized_pic_url = this.state.recognized_pic_url;
    let recognized_cid = this.state.recognized_cid;
    let selected_cid = this.state.categories.find(d => {
      return d.selected;
    }).id;
    if (
      recognized_pic_url != undefined &&
      recognized_pic_url != '' &&
      recognized_cid != undefined &&
      recognized_cid != selected_cid
    ) {
      return (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Image
            style={{
              width: scaleSizeW(206 * 2),
              height: scaleSizeW(275 * 2),
              borderRadius: scaleSizeW(32),
            }}
            source={{uri: this.state.recognized_pic_url}}
          />
          <ImageBackground
            style={{
              width: scaleSizeW(331 * 2),
              height: scaleSizeW(263 * 2),
              alignItems: 'center',
              marginTop: scaleSizeW(28),
            }}
            source={{
              uri: 'http://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/imageidentification/detectedcategorybg.png',
            }}>
            <Text
              numberOfLines={3}
              style={{
                marginTop: scaleSizeW(106 * 2),
                fontSize: scaleSizeW(32),
                color: '#323232',
                width: scaleSizeW(289 * 2),
                textAlign: 'left',
              }}>
              {'雷小安检测到您提供图片中的商品类目与选择的识别类目' +
                this.state.categories.find(d => {
                  return d.selected;
                })?.name +
                '不一致，是否继续？'}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                marginTop: scaleSizeW(47 * 2),
              }}>
              <TouchableOpacity
                onPress={() => {
                  this.setState({
                    resultimageurl: this.state.recognized_pic_url,
                  });
                }}
                style={{
                  backgroundColor: 'white',
                  width: scaleSizeW(139 * 2),
                  height: scaleSizeW(44 * 2),
                  borderRadius: scaleSizeW(36),
                  borderWidth: scaleSizeW(2),
                  borderColor: '#CCCCCC',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Image
                  source={{
                    uri: 'http://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/imageidentification/continue.png',
                  }}
                  style={{width: scaleSizeW(24), height: scaleSizeW(24)}}
                />
                <Text
                  style={{
                    color: '#4c4c4c',
                    fontWeight: '600',
                    fontSize: scaleSizeW(28),
                    marginLeft: scaleSizeW(10),
                  }}>
                  {'继续识别' +
                    this.state.categories.find(d => {
                      return d.selected;
                    })?.name}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  this.state.categories.forEach(d => {
                    d.selected = d.id == this.state.recognized_cid;
                  });
                  this.setState({
                    categories: this.state.categories,
                    resultimageurl: this.state.recognized_pic_url,
                  });
                }}
                style={{
                  backgroundColor: '#028BFE',
                  width: scaleSizeW(139 * 2),
                  height: scaleSizeW(44 * 2),
                  borderRadius: scaleSizeW(36),
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginLeft: scaleSizeW(36),
                  justifyContent: 'center',
                }}>
                <Image
                  source={{
                    uri: 'http://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/imageidentification/exchange.png',
                  }}
                  style={{width: scaleSizeW(24), height: scaleSizeW(24)}}
                />
                <Text
                  style={{
                    color: 'white',
                    fontSize: scaleSizeW(28),
                    marginLeft: scaleSizeW(10),
                  }}>
                  {'切换识别' +
                    this.state.categories.find(d => {
                      return d.id == this.state.recognized_cid;
                    })?.name}
                </Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </View>
      );
    } else {
      return null;
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <CameraPage
          needCrop={true}
          cropRect={this.state.cropRect}
          stop={this.state.stop}
          lightson={this.state.lightson}
          compressionQuality={0.2}
          onTakePhoto={this.onTakePhoto.bind(this)}
          onRecognizeObject={this.onRecognizeObject.bind(this)}
          ref={o => {
            this.camera = o;
          }}
          videoZoom={this.state.videoZoom}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
          imageMode={1} //安卓参数
          navigation={this.props.navigation} //安卓参数
        />

        <RNLxa.ShapeClassListView
          navigation={this.props.navigation}
          handleClose={() => {
            this.setState({
              showSame: false,
              stop: false,
              recognized_cid: undefined,
              recognized_pic_url: undefined,
              resultimageurl: '',
            });
          }}
          app={'interal'}
          api={{
            getAiImgV2: aiImgIdentify,
          }}
          eventWithUserId={() => {}}
          handleShow={() => {
            this.setState({
              loading: false,
              stop: true,
              pickedImagePath: '',
            });
            Vibration.vibrate();
          }}
          visible={this.state.showSame}
          url={this.state.resultimageurl}
          type={this.state.photoType}
          cid={
            this.state.categories.filter(dt => {
              return dt.selected;
            })[0].id || this.props.route.params?.cid
          }
        />
        <TipMask
          show={this.state.showTip}
          handleClose={() => {
            this.setState({showTip: false, stop: false});
          }}
        />
        {this.state.pickedImagePath?.length > 0 ? (
          <Image
            source={{uri: this.state.pickedImagePath}}
            resizeMode="contain"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'black',
            }}
          />
        ) : null}
        {this.state.loading ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
            }}>
            {this.categoryNotPairView()}
          </View>
        ) : (
          <SafeAreaView style={{flex: 1, backgroundColor: 'clear'}}>
            <PageTop
              title={'拍照识款'}
              bgColor={'rgba(0,0,0,0)'}
              style={{borderBottomWidth: 0}}
              titleStyle={{color: 'white'}}
              hideBack
              goBack={this.props.navigation.goBack}
              leftIcon={
                'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/tab/%E8%BF%94%E5%9B%9E%E7%99%BD%E8%89%B2.png'
              }
              // rightStyle={{color: 'white'}}
              // rightTitle="识别须知"
              xuzhi
              showTip={() => {
                this.setState({
                  showTip: true,
                  stop: true,
                });
              }}
              isSafeView={true}
            />
            <Image
              source={{
                uri: this.state.categories.filter(dt => {
                  return dt.selected;
                })[0].exampleurl,
              }}
              style={{
                width: scaleSizeW(164),
                height: scaleSizeW(164),
                marginLeft: scaleSizeW(40),
              }}
            />
            <Image
              onLayout={e => {
                let rect = e.nativeEvent.layout;
                if (Platform.OS === 'ios') {
                  let centerY = rect.y + rect.height / 2;
                  let width = Dimensions.get('window').width;
                  let cropRect = {
                    x: 0,
                    y: centerY - width / 2,
                    width: width,
                    height: width,
                  };
                  this.setState({
                    cropRect: cropRect,
                  });
                } else {
                  this.setState({
                    cropRect: rect,
                  });
                }
              }}
              style={{
                marginTop: scaleSizeW(20),
                width: scaleSizeW(528),
                height: scaleSizeW(528),
                marginLeft: scaleSizeW(112),
              }}
              source={{
                uri: this.state.categories.filter(dt => {
                  return dt.selected;
                })[0].frameurl,
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: scaleSizeW(-100),
                top: scaleSizeW(600),
              }}>
              <Text
                style={{
                  color: 'white',
                  fontSize: scaleSizeW(22),
                  position: 'absolute',
                  top: -scaleSizeW(isIOS() ? 120 : 150),
                  right: scaleSizeW(135),
                }}>
                10X
              </Text>
              <View
                style={{
                  position: 'absolute',
                  width: scaleSizeW(2),
                  top: -scaleSizeW(isIOS() ? 89 : 109),
                  left: scaleSizeW(154),
                  height: scaleSizeW(250),
                  borderWidth: scaleSizeW(1),
                  borderStyle: 'dashed',
                  borderColor: 'rgba(255,255,255,0.7)',
                }}
              />
              <View style={styles.slider}>
                {isIOS() ? (
                  <Slider
                    onValueChange={v => {
                      this.setState({
                        videoZoom: v,
                      });
                    }}
                    minimumValue={1}
                    maximumValue={10}
                    minimumTrackTintColor={'rgba(0,0,0,0)'}
                    maximumTrackTintColor={'rgba(0,0,0,0)'}
                    style={{width: scaleSizeW(312)}}
                    thumbImage={{
                      uri: 'data:image/png;base64,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',
                    }}
                  />
                ) : (
                  <Slider
                    onValueChange={v => {
                      this.setState({
                        videoZoom: v,
                      });
                    }}
                    minimumValue={1}
                    maximumValue={10}
                    minimumTrackTintColor={'rgba(0,0,0,0)'}
                    maximumTrackTintColor={'rgba(0,0,0,0)'}
                    style={{width: scaleSizeW(312)}}
                    thumbTintColor={Colors.color_white}
                  />
                )}
              </View>
              <Text
                style={{
                  color: 'white',
                  fontSize: scaleSizeW(22),
                  position: 'absolute',
                  bottom: -scaleSizeW(150),
                  right: scaleSizeW(145),
                }}>
                1X
              </Text>
            </View>

            <View style={{position: 'absolute', bottom: scaleSizeW(284)}}>
              <View
                style={{
                  width: scaleSizeW(478),
                  height: scaleSizeW(50),
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: scaleSizeW(136),
                }}>
                <View
                  style={{
                    width: scaleSizeW(478),
                    height: scaleSizeW(50),
                    borderRadius: scaleSizeW(12),
                    position: 'absolute',
                    backgroundColor: 'rgba(255,255,255,0.4)',
                  }}
                />
                <Text
                  style={{
                    color: '#191919',
                    fontSize: scaleSizeW(28),
                  }}>
                  {
                    this.state.categories.filter(dt => {
                      return dt.selected;
                    })[0].tip
                  }
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  width: scaleSizeW(750),
                  marginTop: scaleSizeW(20),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {this.state.categories.map((dt, index) => {
                  return (
                    <TouchableOpacity
                      style={{marginLeft: index == 0 ? 0 : scaleSizeW(74)}}
                      key={index}
                      onPress={() => {
                        this.state.categories.forEach(d => {
                          d.selected = false;
                        });
                        dt.selected = true;
                        this.setState({
                          categories: this.state.categories,
                        });
                      }}>
                      <Image
                        style={{width: scaleSizeW(50), height: scaleSizeW(50)}}
                        source={{
                          uri: dt.selected ? dt.selectedimage : dt.image,
                        }}
                      />
                      <Text
                        style={{
                          marginTop: scaleSizeW(20),
                          color: dt.selected
                            ? 'white'
                            : 'rgba(255,255,255,0.4)',
                          fontSize: scaleSizeW(24),
                        }}>
                        {dt.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View
              style={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                right: 0,
                height: scaleSizeW(264),
                paddingLeft: scaleSizeW(108),
                paddingRight: scaleSizeW(108),
                backgroundColor: 'rgba(0,0,0,0.4)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <TouchableOpacity onPress={this.pickImageAction.bind(this)}>
                <Image
                  style={{width: scaleSizeW(56), height: scaleSizeW(56)}}
                  source={{
                    uri: 'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/chooseimage.png',
                  }}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={this.takePhotoAction.bind(this)}>
                <Image
                  style={{width: scaleSizeW(134), height: scaleSizeW(134)}}
                  source={{
                    uri: 'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/takephoto.png',
                  }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  this.setState({lightson: !this.state.lightson});
                }}>
                <Image
                  style={{width: scaleSizeW(56), height: scaleSizeW(56)}}
                  source={{
                    uri: this.state.lightson
                      ? 'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/flashon.png'
                      : 'https://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/PriceQuery/AIResource/flashoff.png',
                  }}
                />
              </TouchableOpacity>
            </View>
            {this.state.loading ? <Load /> : null}
            <Modal visible={this.state.listvisiable} transparent={true}>
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 200,
                  right: 0,
                  bottom: 0,
                }}>
                <AiIdentificationListView
                  goDetail={this.goDetailAction.bind(this)}
                  goBack={this.backAction.bind(this)}
                  reTakePhotoActction={() => {
                    this.setState({
                      stop: false,
                      listvisiable: false,
                    });
                  }}
                  list={this.state.identitylist}
                />
              </View>
            </Modal>
          </SafeAreaView>
        )}
        {this.state.showExchange ? (
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: scaleSizeW(32),
              width: scaleSizeW(2 * 328),
              paddingLeft: scaleSizeW(40),
              paddingRight: scaleSizeW(40),
              paddingTop: scaleSizeW(28),
              paddingBottom: scaleSizeW(37 * 2),
              position: 'absolute',
              alignItems: 'center',
              marginLeft: scaleSizeW(44),
              bottom: scaleSizeW(80),
            }}>
            <View
              style={{
                flexDirection: 'row',
                width: '100%',
                justifyContent: 'space-between',
              }}>
              <TouchableOpacity
                onPress={() => {
                  this.setState({
                    showExchange: false,
                  });
                }}
                style={{width: scaleSizeW(40), height: scaleSizeW(40)}}
              />
              <Text
                style={{
                  color: '#111A34',
                  fontSize: scaleSizeW(32),
                  fontWeight: '600',
                }}>
                识款方式切换
              </Text>
              <TouchableOpacity
                onPress={() => {
                  this.setState({
                    showExchange: false,
                  });
                }}>
                <Image
                  source={{
                    uri: 'http://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/identifyad/close.png',
                  }}
                  style={{width: scaleSizeW(40), height: scaleSizeW(40)}}
                />
              </TouchableOpacity>
            </View>
            <View style={{flexDirection: 'row', marginTop: scaleSizeW(62)}}>
              <TouchableOpacity
                style={{alignItems: 'center'}}
                onPress={() => {
                  this.setState({
                    useOld: true,
                  });
                }}>
                <Image
                  style={{width: scaleSizeW(224), height: scaleSizeW(328)}}
                  source={{
                    uri: this.state.useOld
                      ? 'http://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/identifyad/oldselect.png'
                      : 'http://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/identifyad/oldunsel.png',
                  }}
                />
                <Text
                  style={{
                    fontSize: scaleSizeW(28),
                    color: '#111A34',
                    marginTop: scaleSizeW(26),
                  }}>
                  拍照识款
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  this.setState({
                    useOld: false,
                  });
                }}
                style={{alignItems: 'center', marginLeft: scaleSizeW(38 * 2)}}>
                <Image
                  style={{width: scaleSizeW(224), height: scaleSizeW(328)}}
                  source={{
                    uri: this.state.useOld
                      ? 'http://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/identifyad/newunsel.png'
                      : 'http://ajl-lxa.oss-cn-hangzhou.aliyuncs.com/lxa-app/identifyad/newselect.png',
                  }}
                />
                <Text
                  style={{
                    fontSize: scaleSizeW(28),
                    color: '#111A34',
                    marginTop: scaleSizeW(26),
                  }}>
                  AI智能识款
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={{marginTop: scaleSizeW(27 * 2)}}
              onPress={() => {
                if (this.props.exchangeBlock && !this.state.useOld) {
                  this.props.exchangeBlock();
                }
                this.setState({
                  showExchange: false,
                });
              }}>
              <LinearGradient
                start={{x: 0, y: 0.5}}
                end={{x: 1, y: 0.5}}
                colors={['#69BBFF', '#3496FF']}
                style={{
                  width: scaleSizeW(247 * 2),
                  height: scaleSizeW(44 * 2),
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: scaleSizeW(44),
                }}>
                <Text>
                  <Text
                    style={{
                      fontSize: scaleSizeW(32),
                      fontWeight: '600',
                      color: 'white',
                    }}>
                    {!this.state.useOld
                      ? '确定切换 AI智能识款'
                      : '继续使用 拍照识款'}
                  </Text>
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  }

  backAction() {
    if (this.props.route.params) {
      this.setState({listvisiable: false});
      this.props.navigation.goBack();
    } else {
      this.setState({
        listvisiable: false,
        stop: false,
      });
    }
  }

  goDetailAction(data) {
    this.setState({
      listvisiable: false,
    });
    if (this.props.route.params) {
      this.props.navigation.replace('AiIdentificationDetailView', {
        data: data,
      });
    } else {
      this.props.navigation.push('AiIdentificationDetailView', {
        data: data,
      });
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slider: {
    transform: [{rotateZ: '-90deg'}],
    alignItems: 'center',
  },
});
