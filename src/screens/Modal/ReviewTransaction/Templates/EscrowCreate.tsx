import isEmpty from 'lodash/isEmpty';
import React, { Component } from 'react';
import { View, Text } from 'react-native';

import { EscrowCreate } from '@common/libs/ledger/transactions';

import { getAccountName } from '@common/helpers/resolver';

import { Spacer } from '@components/General';

import Localize from '@locale';

import { AppStyles } from '@theme';
import styles from './styles';

/* types ==================================================================== */
export interface Props {
    transaction: EscrowCreate;
}

export interface State {
    isLoading: boolean;
    destinationName: string;
}

/* Component ==================================================================== */
class EscrowCreateTemplate extends Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            isLoading: false,
            destinationName: '',
        };
    }
    componentDidMount() {
        const { transaction } = this.props;

        this.setState({
            isLoading: true,
        });

        getAccountName(transaction.Destination.address)
            .then((res: any) => {
                if (!isEmpty(res) && !res.error) {
                    this.setState({
                        destinationName: res.name,
                    });
                }
            })
            .catch(() => {
                // ignore
            })
            .finally(() => {
                this.setState({
                    isLoading: false,
                });
            });
    }

    render() {
        const { transaction } = this.props;
        const { isLoading, destinationName } = this.state;
        return (
            <>
                <Text style={[styles.label]}>
                    {Localize.t('global.to')}:{' '}
                    {isLoading ? (
                        'Loading ...'
                    ) : (
                        <Text style={styles.value}>{destinationName || Localize.t('global.noNameFound')}</Text>
                    )}
                </Text>
                <View style={[styles.contentBox]}>
                    <Text selectable style={[styles.address]}>
                        {transaction.Destination.address}
                    </Text>
                    <Spacer size={15} />

                    {transaction.Destination.tag && (
                        <View style={[styles.destinationAddress]}>
                            <Text style={[AppStyles.monoSubText, AppStyles.colorGreyDark]}>
                                {Localize.t('global.destinationTag')}:{' '}
                                <Text style={AppStyles.colorBlue}>{transaction.Destination.tag}</Text>
                            </Text>
                        </View>
                    )}
                </View>

                <Text style={[styles.label]}>{Localize.t('global.amount')}</Text>
                <View style={[styles.contentBox]}>
                    <Text style={[styles.amount]}>{`${transaction.Amount.value} ${transaction.Amount.currency}`}</Text>
                </View>

                {transaction.FinishAfter && (
                    <>
                        <Text style={[styles.label]}>{Localize.t('global.finishAfter')}</Text>
                        <View style={[styles.contentBox]}>
                            <Text style={[styles.value]}>{transaction.FinishAfter}</Text>
                        </View>
                    </>
                )}

                {transaction.CancelAfter && (
                    <>
                        <Text style={[styles.label]}>{Localize.t('global.cancelAfter')}</Text>
                        <View style={[styles.contentBox]}>
                            <Text style={[styles.value]}>{transaction.CancelAfter}</Text>
                        </View>
                    </>
                )}
            </>
        );
    }
}

export default EscrowCreateTemplate;
