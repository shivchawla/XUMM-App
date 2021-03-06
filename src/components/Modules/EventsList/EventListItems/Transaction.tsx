import React, { Component } from 'react';
import { View, Text, TouchableHighlight } from 'react-native';
import { isEmpty, isEqual } from 'lodash';

import { TransactionsType } from '@common/libs/ledger/transactions/types';
import { AccountSchema } from '@store/schemas/latest';

import { Navigator } from '@common/helpers/navigator';
import { getAccountName } from '@common/helpers/resolver';
import { NormalizeCurrencyCode } from '@common/libs/utils';
import { AppScreens } from '@common/constants';

import Localize from '@locale';

import { Icon, Avatar } from '@components/General';

import { AppStyles } from '@theme';
import styles from './styles';

/* types ==================================================================== */
export interface Props {
    account: AccountSchema;
    item: TransactionsType;
    timestamp?: number;
}

export interface State {
    name: string;
    address: string;
    tag: number;
    key: string;
}

/* Component ==================================================================== */
class TransactionTemplate extends Component<Props, State> {
    private mounted: boolean;

    constructor(props: Props) {
        super(props);

        const recipientDetails = this.getRecipientDetails();

        this.state = {
            name: recipientDetails.name,
            address: recipientDetails.address,
            tag: recipientDetails.tag,
            key: recipientDetails.key,
        };
    }

    shouldComponentUpdate(nextProps: Props, nextState: State) {
        const { timestamp } = this.props;
        return !isEqual(nextState, this.state) || !isEqual(nextProps.timestamp, timestamp);
    }

    componentDidMount() {
        const { name, key } = this.state;
        const { item } = this.props;

        this.mounted = true;

        if (!name) {
            this.lookUpRecipientName();
        } else if (key) {
            item[key] = {
                name,
            };
        }
    }

    componentDidUpdate(prevProps: Props) {
        const { timestamp } = this.props;

        // force the lookup if timestamp changed
        if (timestamp !== prevProps.timestamp) {
            this.lookUpRecipientName();
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    getRecipientDetails = () => {
        const { item, account } = this.props;

        let address;
        let tag;
        let key;

        switch (item.Type) {
            case 'Payment':
                if (item.Destination.address === account.address) {
                    address = item.Account.address;
                    key = 'Account';
                } else {
                    address = item.Destination.address;
                    tag = item.Destination.tag;
                    key = 'Destination';
                }
                break;
            case 'AccountDelete':
                address = item.Account.address;
                key = 'Account';
                break;
            case 'CheckCreate':
                address = item.Destination.address;
                tag = item.Destination.tag;
                key = 'Destination';
                break;
            case 'CheckCash':
                address = item.Account.address;
                key = 'Account';
                break;
            case 'CheckCancel':
                address = item.Account.address;
                key = 'Account';
                break;
            case 'TrustSet':
                address = item.Issuer;
                break;
            case 'EscrowCreate':
                address = item.Destination.address;
                tag = item.Destination.tag;
                key = 'Destination';
                break;
            case 'EscrowCancel':
                address = item.Owner;
                break;
            case 'EscrowFinish':
                address = item.Destination.address;
                tag = item.Destination.tag;
                key = 'Destination';
                break;
            case 'DepositPreauth':
                address = item.Authorize || item.Unauthorize;
                break;
            default:
                break;
        }

        // this this transactions are belong to account
        if (
            item.Type === 'AccountSet' ||
            item.Type === 'SignerListSet' ||
            item.Type === 'SetRegularKey' ||
            item.Type === 'OfferCancel' ||
            item.Type === 'OfferCreate'
        ) {
            return {
                address,
                tag,
                name: account.label,
                key: 'Account',
            };
        }

        return {
            address,
            tag,
            name: undefined,
            key,
        };
    };

    lookUpRecipientName = () => {
        const { address, tag, key } = this.state;
        const { item } = this.props;

        getAccountName(address, tag)
            .then((res: any) => {
                if (!isEmpty(res) && res.name) {
                    if (this.mounted) {
                        if (key) {
                            item[key] = {
                                name: res.name,
                            };
                        }
                        this.setState({
                            name: res.name,
                        });
                    }
                }
            })
            .catch(() => {});
    };

    onPress = () => {
        const { item, account } = this.props;
        Navigator.push(AppScreens.Transaction.Details, {}, { tx: item, account });
    };

    getIcon = () => {
        const { address } = this.state;
        const { item } = this.props;

        if (address) {
            return <Avatar size={40} border source={{ uri: `https://xumm.app/avatar/${address}_180_50.png` }} />;
        }
        let iconName = '' as any;
        let iconColor;

        switch (item.Type) {
            case 'OfferCreate':
                iconName = 'IconSwitchAccount';
                break;
            default:
                iconName = 'IconAccount';
                break;
        }

        return (
            <View style={styles.iconContainer}>
                <Icon size={20} style={[styles.icon, iconColor]} name={iconName} />
            </View>
        );
    };

    getLabel = () => {
        const { name, address } = this.state;
        const { item, account } = this.props;

        if (item.Type === 'OfferCreate') {
            if (item.Executed) {
                const takerGot = item.TakerGot(account.address);
                const takerPaid = item.TakerPaid(account.address);

                return `${Localize.formatNumber(takerGot.value)} ${NormalizeCurrencyCode(
                    takerGot.currency,
                )}/${NormalizeCurrencyCode(takerPaid.currency)}`;
            }
            return `${Localize.formatNumber(item.TakerGets.value)} ${NormalizeCurrencyCode(
                item.TakerGets.currency,
            )}/${NormalizeCurrencyCode(item.TakerPays.currency)}`;
        }

        if (item.Type === 'Payment') {
            if ([item.Account.address, item.Destination?.address].indexOf(account.address) === -1) {
                const balanceChanges = item.BalanceChange(account.address);

                if (balanceChanges?.sent && balanceChanges?.received) {
                    return `${Localize.formatNumber(balanceChanges.sent.value)} ${NormalizeCurrencyCode(
                        balanceChanges.sent.currency,
                    )}/${NormalizeCurrencyCode(balanceChanges.received.currency)}`;
                }
            }
        }

        if (name) return name;
        if (address) return address;

        return Localize.t('global.unknown');
    };

    getDescription = () => {
        const { item, account } = this.props;

        switch (item.Type) {
            case 'Payment':
                if ([item.Account.address, item.Destination?.address].indexOf(account.address) === -1) {
                    const balanceChanges = item.BalanceChange(account.address);
                    if (balanceChanges?.sent && balanceChanges?.received) {
                        return Localize.t('events.exchangedAssets');
                    }
                    return Localize.t('global.payment');
                }
                if (item.Destination.address === account.address) {
                    return Localize.t('events.paymentReceived');
                }
                return Localize.t('events.paymentSent');
            case 'TrustSet':
                if (item.Account.address !== account.address && item.Limit !== 0) {
                    return Localize.t('events.incomingTrustLineAdded');
                }
                if (item.Limit === 0) {
                    return Localize.t('events.removedATrustLine');
                }
                return Localize.t('events.addedATrustLine');
            case 'EscrowCreate':
                return Localize.t('events.createEscrow');
            case 'EscrowFinish':
                return Localize.t('events.finishEscrow');
            case 'EscrowCancel':
                return Localize.t('events.cancelEscrow');
            case 'AccountSet':
                return Localize.t('events.accountSettings');
            case 'SignerListSet':
                return Localize.t('events.setSignerList');
            case 'OfferCreate':
                if (item.Executed) {
                    return Localize.t('events.exchangedAssets');
                }
                return Localize.t('events.createOffer');
            case 'OfferCancel':
                return Localize.t('events.cancelOffer');
            case 'AccountDelete':
                return Localize.t('events.deleteAccount');
            case 'SetRegularKey':
                return Localize.t('events.setRegularKey');
            case 'DepositPreauth':
                if (item.Authorize) {
                    return Localize.t('events.authorizeDeposit');
                }
                return Localize.t('events.unauthorizeDeposit');
            case 'CheckCreate':
                return Localize.t('events.createCheck');
            case 'CheckCash':
                return Localize.t('events.cashCheck');
            case 'CheckCancel':
                return Localize.t('events.cancelCheck');
            default:
                return item.Type;
        }
    };

    renderMemoIcon = () => {
        const { item } = this.props;

        if (item.Memos) {
            return (
                <Icon name="IconFileText" style={[AppStyles.imgColorGreyDark, AppStyles.paddingLeftSml]} size={12} />
            );
        }

        return null;
    };

    renderRightPanel = () => {
        const { item, account } = this.props;

        let incoming = item.Destination?.address === account.address;

        if (item.Type === 'Payment') {
            if ([item.Account.address, item.Destination?.address].indexOf(account.address) === -1) {
                const balanceChanges = item.BalanceChange(account.address);

                if (balanceChanges?.received) {
                    return (
                        <Text style={[styles.amount]} numberOfLines={1}>
                            {Localize.formatNumber(balanceChanges.received?.value)}{' '}
                            <Text style={[styles.currency]}>
                                {NormalizeCurrencyCode(balanceChanges.received?.currency)}
                            </Text>
                        </Text>
                    );
                }
            }
            return (
                <Text style={[styles.amount, !incoming && styles.outgoingColor]} numberOfLines={1}>
                    {incoming ? '' : '-'}
                    {Localize.formatNumber(item.Amount.value)}{' '}
                    <Text style={[styles.currency]}>{NormalizeCurrencyCode(item.Amount.currency)}</Text>
                </Text>
            );
        }

        if (item.Type === 'AccountDelete') {
            return (
                <Text style={[styles.amount, !incoming && styles.outgoingColor]} numberOfLines={1}>
                    {incoming ? '' : '-'}
                    {Localize.formatNumber(item.Amount.value)}{' '}
                    <Text style={[styles.currency]}>{NormalizeCurrencyCode(item.Amount.currency)}</Text>
                </Text>
            );
        }

        if (item.Type === 'EscrowCreate') {
            return (
                <Text style={[styles.amount, incoming ? styles.orangeColor : styles.outgoingColor]} numberOfLines={1}>
                    {!incoming && '-'}
                    {Localize.formatNumber(item.Amount.value)}{' '}
                    <Text style={[styles.currency]}>{NormalizeCurrencyCode(item.Amount.currency)}</Text>
                </Text>
            );
        }

        if (item.Type === 'EscrowFinish') {
            return (
                <Text style={[styles.amount, !incoming && styles.naturalColor]} numberOfLines={1}>
                    {!incoming && '-'}
                    {Localize.formatNumber(item.Amount.value)}{' '}
                    <Text style={[styles.currency]}>{NormalizeCurrencyCode(item.Amount.currency)}</Text>
                </Text>
            );
        }

        if (item.Type === 'CheckCreate') {
            return (
                <Text style={[styles.amount, styles.naturalColor]} numberOfLines={1}>
                    {Localize.formatNumber(item.SendMax.value)}{' '}
                    <Text style={[styles.currency]}>{NormalizeCurrencyCode(item.SendMax.currency)}</Text>
                </Text>
            );
        }

        if (item.Type === 'CheckCash') {
            const amount = item.Amount || item.DeliverMin;
            incoming = item.Account.address === account.address;
            return (
                <Text style={[styles.amount, !incoming && styles.outgoingColor]} numberOfLines={1}>
                    {incoming ? '' : '-'}
                    {Localize.formatNumber(amount.value)}{' '}
                    <Text style={[styles.currency]}>{NormalizeCurrencyCode(amount.currency)}</Text>
                </Text>
            );
        }

        if (item.Type === 'OfferCreate') {
            if (item.Executed) {
                const takerPaid = item.TakerPaid(account.address);

                return (
                    <Text style={[styles.amount]} numberOfLines={1}>
                        {Localize.formatNumber(takerPaid.value)}{' '}
                        <Text style={[styles.currency]}>{NormalizeCurrencyCode(takerPaid.currency)}</Text>
                    </Text>
                );
            }
            return (
                <Text style={[styles.amount, styles.naturalColor]} numberOfLines={1}>
                    {Localize.formatNumber(item.TakerPays.value)}{' '}
                    <Text style={[styles.currency]}>{NormalizeCurrencyCode(item.TakerPays.currency)}</Text>
                </Text>
            );
        }

        return null;
    };

    render() {
        return (
            <TouchableHighlight onPress={this.onPress} underlayColor="#FFF">
                <View style={[AppStyles.row, styles.container]}>
                    <View style={[AppStyles.flex1, AppStyles.centerContent]}>{this.getIcon()}</View>
                    <View style={[AppStyles.flex3, AppStyles.centerContent]}>
                        <Text style={[styles.label]} numberOfLines={1}>
                            {this.getLabel()}
                        </Text>
                        <View style={[AppStyles.row, AppStyles.centerAligned]}>
                            <Text style={[styles.description]} numberOfLines={1}>
                                {this.getDescription()}
                            </Text>

                            {this.renderMemoIcon()}
                        </View>
                    </View>
                    <View style={[AppStyles.flex2, AppStyles.rightAligned, AppStyles.centerContent]}>
                        {this.renderRightPanel()}
                    </View>
                </View>
            </TouchableHighlight>
        );
    }
}

export default TransactionTemplate;
