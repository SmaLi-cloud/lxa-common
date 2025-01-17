/*
 * @Author: yangzhixin
 * @Date: 2024-05-29 15:45:38
 * @LastEditors: yangzhixin
 * @LastEditTime: 2024-06-18 15:37:14
 * @Description: file content
 * @FilePath: /leixiaoan-live-app/src/components/BidModal.js
 */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import {scaleSizeW} from '../utils/util';
import {goPage, pageReset} from '../utils/navigate';
import {useDispatch, useMappedState} from 'redux-react-hook';
import {tradeOfferDialog} from '../api/api';
import userHelper from '../helper/userHelper';
import uniqBy from 'lodash/uniqBy';
import StorageUtil from '../utils/StorageUtil';
import usePermission from '../useHook/usePermission';

const BidModal = props => {
  const {navigationRef} = props;
  const dispatch = useDispatch();
  const [permission] = usePermission('trade_bargaining'); // [
  const bidMessage = useMappedState(st => st.bidMessage);
  const getBidMessage = async () => {
    let token = await userHelper.getToken();
    if (!token) {
      return;
    }
    try {
      const res = await tradeOfferDialog({
        page: 1,
        per_page: 999,
      });
      let data = res?.data?.data;
      // StorageUtil.deleteItem('bidMessageLocal');
      let local = await StorageUtil.get('bidMessageLocal');
      console.log(local, 'getLocal');
      if (local) {
        data = data.filter(x => {
          return !uniqBy(String(local)?.split(','))?.includes(String(x.id));
        });
      }
      dispatch({
        type: 'UnReadBidMessage',
        bidMessage: data,
      });
    } catch (e) {
      console.log(e);
    }
  };
  useEffect(() => {
    // 5 * 60 * 1000
    const intervalIdB = setInterval(getBidMessage, 5 * 60 * 1000);
    getBidMessage(); // 获取初始数据
    return () => clearInterval(intervalIdB);
  }, []);
  return bidMessage?.length > 0 && permission ? (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View
        style={{
          width: scaleSizeW(606),
          height: scaleSizeW(631),
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: scaleSizeW(26),
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
        }}>
        <ImageBackground
          source={{
            uri: 'https://oss.leixiaoan.com/lxa-app/shareAction/trade/bid_modal.png',
          }}
          style={{
            width: scaleSizeW(580),
            height: scaleSizeW(604),
            paddingTop: scaleSizeW(172),
            paddingHorizontal: scaleSizeW(32),
          }}>
          <View>
            {/* info */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#fff',
                borderRadius: scaleSizeW(16),
                padding: scaleSizeW(16),
                alignSelf: 'center',
              }}>
              <Image
                source={{
                  uri: bidMessage[0]?.front_pic,
                }}
                style={{
                  width: scaleSizeW(116),
                  height: scaleSizeW(116),
                }}
              />
              <View
                style={{
                  width: scaleSizeW(352),
                  marginLeft: scaleSizeW(16),
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}>
                <Text
                  numberOfLines={2}
                  style={{
                    fontWeight: '400',
                    fontSize: scaleSizeW(24),
                    color: '#41485d',
                  }}>
                  {bidMessage[0]?.goods_title}
                </Text>
                <Text>
                  <Text
                    style={{
                      fontSize: scaleSizeW(20),
                      color: '#41485D',
                      fontWeight: 'bold',
                    }}>
                    ￥
                  </Text>
                  <Text
                    style={{
                      fontSize: scaleSizeW(28),
                      color: '#41485D',
                      fontWeight: 'bold',
                    }}>
                    {bidMessage[0]?.redirect_params?.setup?.goods_price / 100}
                  </Text>
                </Text>
              </View>
            </View>
            {/* price */}
            <View
              style={{
                marginTop: scaleSizeW(24),
                alignSelf: 'center',
                height: scaleSizeW(80),
              }}>
              <Text>
                <Text
                  style={{
                    fontSize: scaleSizeW(24),
                    color: '#028bfe',
                    fontWeight: 'bold',
                  }}>
                  ￥
                </Text>
                <Text
                  style={{
                    fontSize: scaleSizeW(56),
                    color: '#028bfe',
                    fontWeight: 'bold',
                  }}>
                  {bidMessage[0]?.redirect_params?.setup?.report_price / 100}
                </Text>
              </Text>
            </View>
            <Text
              style={{
                color: '#858b9c',
                fontSize: scaleSizeW(24),
                fontWeight: '500',
                alignSelf: 'center',
              }}>
              最新出价
            </Text>
          </View>
          {/* bottom */}
          <TouchableOpacity
            style={{
              marginTop: scaleSizeW(24),
            }}
            onPress={() => {
              // 跳转到出价页面
              if (navigationRef.value?.getCurrentRoute()?.name === 'MyBid') {
                dispatch({
                  type: 'UnReadBidMessage',
                  bidMessage: [],
                });
                return;
              }
              goPage('MyBid', {type: 3});
              // // 获取当前页面的navigation
              dispatch({
                type: 'UnReadBidMessage',
                bidMessage: [],
              });
            }}>
            <Image
              source={{
                uri: 'https://oss.leixiaoan.com/lxa-app/shareAction/trade/now_see.png',
              }}
              style={{
                width: scaleSizeW(516),
                height: scaleSizeW(88),
              }}
            />
          </TouchableOpacity>
        </ImageBackground>
      </View>
      <TouchableOpacity
        style={{
          marginTop: scaleSizeW(34),
        }}
        activeOpacity={0.6}
        onPress={async () => {
          let arr = [...bidMessage];
          let id = arr[0]?.id;
          arr.shift();
          dispatch({
            type: 'UnReadBidMessage',
            bidMessage: arr,
          });
          // 记下被shift的id
          // 本地缓存+1
          let local = await StorageUtil.get('bidMessageLocal');
          console.log(local, id, 'local');
          if (local) {
            local = local + ',' + id;
            StorageUtil.save('bidMessageLocal', local);
          } else {
            console.log(222);
            StorageUtil.save('bidMessageLocal', id + '');
          }
        }}>
        <Image
          source={{
            uri: 'https://oss.leixiaoan.com/lxa-app/shareAction/trade/close_bid.png',
          }}
          style={{
            width: scaleSizeW(70),
            height: scaleSizeW(70),
          }}
        />
      </TouchableOpacity>
    </View>
  ) : null;
};
export default BidModal;
